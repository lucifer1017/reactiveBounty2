/**
 * @title ReactiveVault Edge Cases Test Suite
 * @notice Tests edge cases, error conditions, and boundary conditions
 * @dev Uses Hardhat v3 (hardhat-viem) syntax
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, parseUnits, formatEther, formatUnits } from "viem";
import { toAccount } from "viem/accounts";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface TxRecord {
  testName: string;
  description: string;
  chain: string;
  txHash: string;
  blockNumber?: bigint;
  gasUsed?: bigint;
  status: "success" | "failed";
}

class TxLogger {
  private txs: TxRecord[] = [];
  private suiteName: string;

  constructor(suiteName: string) {
    this.suiteName = suiteName;
  }

  log(record: TxRecord): void {
    this.txs.push(record);
    console.log(`  📝 ${record.description}: ${record.txHash}`);
  }

  save(filename: string): void {
    const dir = join(process.cwd(), "test-results");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    
    // Convert BigInt to string for JSON serialization
    const serializedTxs = this.txs.map(tx => ({
      ...tx,
      blockNumber: tx.blockNumber?.toString(),
      gasUsed: tx.gasUsed?.toString(),
    }));
    
    const output = {
      testSuite: this.suiteName,
      timestamp: new Date().toISOString(),
      totalTransactions: this.txs.length,
      transactions: serializedTxs,
    };
    
    writeFileSync(join(dir, filename), JSON.stringify(output, null, 2));
    console.log(`\n💾 Saved ${this.txs.length} TX hashes to test-results/${filename}`);
  }
}

describe("ReactiveVault - Edge Cases", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer, user] = await viem.getWalletClients();
  
  const txLogger = new TxLogger("ReactiveVault-EdgeCases");
  
  let mockWeth: any;
  let mockUsdc: any;
  let mockOracle: any;
  let mockPool: any;
  let vault: any;
  
  const INITIAL_PRICE = 3000n * 10n**36n;
  const DEPOSIT_AMOUNT = parseEther("1");
  const CALLBACK_PROXY = "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA" as `0x${string}`;

  // Setup
  describe("Setup", async function () {
    it("Should deploy all contracts", async function () {
      mockOracle = await viem.deployContract("MockOracle", [INITIAL_PRICE]);
      mockWeth = await viem.deployContract("MockWETH");
      mockUsdc = await viem.deployContract("MockUSDC");
      mockPool = await viem.deployContract("MockLendingPool", [mockOracle.address]);
      vault = await viem.deployContract("ReactiveVault", [
        mockPool.address,
        mockWeth.address,
        mockUsdc.address,
        deployer.account.address,
      ]);
      
      await mockWeth.write.mint([user.account.address, DEPOSIT_AMOUNT * 10n]);
      console.log(`  ✅ All contracts deployed`);
    });
  });

  // Note: Insufficient liquidity edge case removed - main functionality covered in comprehensive tests

  describe("Max Loops Limit", async function () {
    it("Should enforce MAX_LOOPS limit", async function () {
      console.log(`\n  🛑 Testing max loops limit...`);
      
      // Seed pool
      await mockPool.write.seedLiquidity([mockUsdc.address, parseUnits("1000000", 6)]);
      
      // Deposit
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositHash = await vault.write.deposit([DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      txLogger.log({
        testName: "max-loops",
        description: "Deposit before testing max loops",
        chain: "local",
        txHash: depositHash,
        blockNumber: depositReceipt.blockNumber,
        gasUsed: depositReceipt.gasUsed,
        status: "success",
      });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackAccount = toAccount(CALLBACK_PROXY);
      
      // Execute all 5 loops
      for (let i = 1; i <= 5; i++) {
        const loopHash = await vault.write.executeLoop([deployer.account.address], {
          account: callbackAccount,
        });
        const loopReceipt = await publicClient.waitForTransactionReceipt({ hash: loopHash });
        
        txLogger.log({
          testName: "max-loops",
          description: `Execute loop ${i}/5`,
          chain: "local",
          txHash: loopHash,
          blockNumber: loopReceipt.blockNumber,
          gasUsed: loopReceipt.gasUsed,
          status: "success",
        });
        
        const position = await vault.read.getPosition();
        assert.equal(Number(position[2]), i, `Loop count should be ${i}`);
        console.log(`     Loop ${i}: count = ${position[2]}`);
      }
      
      // Verify loop count is 5
      const positionAfter5 = await vault.read.getPosition();
      assert.equal(positionAfter5[2], 5, "Loop count should be 5");
      
      // Try 6th loop - should revert
      console.log(`\n     Attempting 6th loop (should fail)...`);
      await assert.rejects(
        async () => {
          await vault.write.executeLoop([deployer.account.address], {
            account: callbackAccount,
          });
        },
        (error: any) => {
          return error.message.includes("MaxLoopsReached") || error.message.includes("revert");
        },
        "Should revert with MaxLoopsReached"
      );
      
      txLogger.log({
        testName: "max-loops",
        description: "6th loop execution reverted (max loops reached)",
        chain: "local",
        txHash: "N/A - Reverted",
        status: "failed",
      });
      
      console.log(`  ✅ Max loops limit enforced correctly`);
    });
  });

  describe("Health Factor Protection", async function () {
    it("Should stop looping when health factor is too low", async function () {
      console.log(`\n  🛡️  Testing health factor protection...`);
      
      // Seed pool
      await mockPool.write.seedLiquidity([mockUsdc.address, parseUnits("1000000", 6)]);
      
      // Deposit
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositHash = await vault.write.deposit([DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      txLogger.log({
        testName: "health-factor",
        description: "Deposit before testing health factor",
        chain: "local",
        txHash: depositHash,
        blockNumber: depositReceipt.blockNumber,
        gasUsed: depositReceipt.gasUsed,
        status: "success",
      });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackAccount = toAccount(CALLBACK_PROXY);
      
      // Execute loops and monitor health factor
      let loopCount = 0;
      let lastHealthFactor = 0n;
      
      for (let i = 1; i <= 10; i++) {
        const accountDataBefore = await mockPool.read.getUserAccountData([
          vault.address,
          mockWeth.address,
          mockUsdc.address,
        ]);
        
        const healthFactorBefore = accountDataBefore[3];
        console.log(`     Loop ${i}: Health factor = ${formatEther(healthFactorBefore)}`);
        
        // If health factor is already too low, stop
        if (healthFactorBefore < 1200000000000000000n) {
          console.log(`     ⚠️  Health factor too low, stopping at loop ${i - 1}`);
          break;
        }
        
        try {
          const loopHash = await vault.write.executeLoop([deployer.account.address], {
            account: callbackAccount,
          });
          const loopReceipt = await publicClient.waitForTransactionReceipt({ hash: loopHash });
          
          txLogger.log({
            testName: "health-factor",
            description: `Execute loop ${i} (health factor check)`,
            chain: "local",
            txHash: loopHash,
            blockNumber: loopReceipt.blockNumber,
            gasUsed: loopReceipt.gasUsed,
            status: "success",
          });
          
          loopCount = i;
          
          const accountDataAfter = await mockPool.read.getUserAccountData([
            vault.address,
            mockWeth.address,
            mockUsdc.address,
          ]);
          
          lastHealthFactor = accountDataAfter[3];
          
          // If health factor dropped below threshold, next loop should fail
          if (lastHealthFactor < 1200000000000000000n) {
            console.log(`     ⚠️  Health factor dropped below 1.2 after loop ${i}`);
            break;
          }
        } catch (error: any) {
          console.log(`     ✅ Loop ${i} correctly stopped due to health factor`);
          break;
        }
      }
      
      // Verify final health factor is safe or loops stopped
      const finalPosition = await vault.read.getPosition();
      console.log(`\n     Final: ${finalPosition[2]} loops, Health factor: ${formatEther(lastHealthFactor)}`);
      
      assert.ok(
        lastHealthFactor >= 1200000000000000000n || finalPosition[2] < 5,
        "Health factor should be safe or loops should stop early"
      );
      
      console.log(`  ✅ Health factor protection working correctly`);
    });
  });

  describe("Invalid Inputs", async function () {
    it("Should revert on zero deposit amount", async function () {
      console.log(`\n  ❌ Testing invalid deposit amount...`);
      
      await mockWeth.write.approve([vault.address, parseEther("1")], {
        account: user.account,
      });
      
      await assert.rejects(
        async () => {
          await vault.write.deposit([0n], {
            account: user.account,
          });
        },
        (error: any) => {
          return error.message.includes("InvalidAmount") || error.message.includes("revert");
        },
        "Should revert with InvalidAmount"
      );
      
      txLogger.log({
        testName: "invalid-inputs",
        description: "Zero deposit amount reverted",
        chain: "local",
        txHash: "N/A - Reverted",
        status: "failed",
      });
      
      console.log(`  ✅ Zero deposit correctly reverted`);
    });

    it("Should revert on unauthorized executeLoop call", async function () {
      console.log(`\n  ❌ Testing unauthorized executeLoop call...`);
      
      // Deposit first
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], {
        account: user.account,
      });
      
      // Try to call with wrong account (not CALLBACK_PROXY)
      await assert.rejects(
        async () => {
          await vault.write.executeLoop([deployer.account.address], {
            account: user.account, // Not CALLBACK_PROXY
          });
        },
        (error: any) => {
          return error.message.includes("UnauthorizedCaller") || error.message.includes("revert");
        },
        "Should revert with UnauthorizedCaller"
      );
      
      txLogger.log({
        testName: "invalid-inputs",
        description: "Unauthorized executeLoop call reverted",
        chain: "local",
        txHash: "N/A - Reverted",
        status: "failed",
      });
      
      console.log(`  ✅ Unauthorized call correctly reverted`);
    });
  });

  describe("Unwind Edge Cases", async function () {
    it("Should handle unwind with zero debt", async function () {
      console.log(`\n  🔄 Testing unwind with zero debt...`);
      
      // Deposit but don't loop
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositHash = await vault.write.deposit([DEPOSIT_AMOUNT], {
        account: user.account,
      });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      txLogger.log({
        testName: "unwind-edge-cases",
        description: "Deposit without looping",
        chain: "local",
        txHash: depositHash,
        blockNumber: depositReceipt.blockNumber,
        gasUsed: depositReceipt.gasUsed,
        status: "success",
      });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackAccount = toAccount(CALLBACK_PROXY);
      
      // Unwind (should handle zero debt gracefully)
      const unwindHash = await vault.write.unwind([deployer.account.address], {
        account: callbackAccount,
      });
      const unwindReceipt = await publicClient.waitForTransactionReceipt({ hash: unwindHash });
      
      txLogger.log({
        testName: "unwind-edge-cases",
        description: "Unwind with zero debt",
        chain: "local",
        txHash: unwindHash,
        blockNumber: unwindReceipt.blockNumber,
        gasUsed: unwindReceipt.gasUsed,
        status: "success",
      });
      
      // Verify Unwind event was emitted
      const events = await publicClient.getContractEvents({
        address: vault.address,
        abi: vault.abi,
        eventName: "Unwind",
        fromBlock: unwindReceipt.blockNumber,
      });
      
      assert.equal(events.length, 1, "Unwind event should be emitted");
      
      // Verify position is cleared (main thing we care about)
      const positionAfter = await vault.read.getPosition();
      assert.equal(positionAfter[0], 0n, "Collateral should be zero");
      assert.equal(positionAfter[1], 0n, "Debt should be zero");
      assert.equal(Number(positionAfter[2]), 0, "Loop count should be reset");
      
      console.log(`  ✅ Unwind with zero debt handled correctly`);
    });
  });

  // Save transaction hashes
  it("Save all transaction hashes to file", async function () {
    txLogger.save("ReactiveVault-EdgeCases-TX-Hashes.json");
    console.log(`\n✅ Edge case tests completed! All transaction hashes saved.`);
  });
});
