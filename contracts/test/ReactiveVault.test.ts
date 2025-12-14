/**
 * @title ReactiveVault Comprehensive Test Suite
 * @notice Tests all functionality of ReactiveVault contract
 * @dev Uses Hardhat v3 (hardhat-viem) syntax following Counter.ts pattern
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther, parseUnits, formatEther, formatUnits } from "viem";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Transaction logger utility
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

describe("ReactiveVault - Comprehensive Test Suite", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer, user] = await viem.getWalletClients();
  
  const txLogger = new TxLogger("ReactiveVault-Full");
  
  // Contract instances
  let mockWeth: any;
  let mockUsdc: any;
  let mockOracle: any;
  let mockPool: any;
  let vault: any;
  
  // Constants
  const INITIAL_PRICE = 3000n * 10n**36n; // $3000 per WETH
  const DEPOSIT_AMOUNT = parseEther("1"); // 1 WETH
  const LIQUIDITY_AMOUNT = parseUnits("1000000", 6); // 1M USDC
  const CALLBACK_PROXY = "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA" as `0x${string}`;

  // Setup: Deploy all contracts
  describe("Setup - Contract Deployment", async function () {
    it("Should deploy MockOracle with initial price", async function () {
      const deploymentBlock = await publicClient.getBlockNumber();
      mockOracle = await viem.deployContract("MockOracle", [INITIAL_PRICE]);
      
      // Get deployment transaction from recent blocks
      const latestBlock = await publicClient.getBlockNumber();
      let deployTxHash: string | undefined;
      for (let i = deploymentBlock; i <= latestBlock; i++) {
        const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === null && tx.contractAddress?.toLowerCase() === mockOracle.address.toLowerCase()) {
            deployTxHash = tx.hash;
            break;
          }
        }
        if (deployTxHash) break;
      }
      
      if (deployTxHash) {
        const receipt = await publicClient.getTransactionReceipt({ hash: deployTxHash as `0x${string}` });
        txLogger.log({
          testName: "setup",
          description: "Deploy MockOracle",
          chain: "local",
          txHash: deployTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
      }
      
      const price = await mockOracle.read.price();
      assert.equal(price, INITIAL_PRICE, "Oracle price should be $3000");
      console.log(`  ✅ MockOracle deployed: ${mockOracle.address}`);
    });

    it("Should deploy MockWETH", async function () {
      const deploymentBlock = await publicClient.getBlockNumber();
      mockWeth = await viem.deployContract("MockWETH");
      
      const latestBlock = await publicClient.getBlockNumber();
      let deployTxHash: string | undefined;
      for (let i = deploymentBlock; i <= latestBlock; i++) {
        const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === null && tx.contractAddress?.toLowerCase() === mockWeth.address.toLowerCase()) {
            deployTxHash = tx.hash;
            break;
          }
        }
        if (deployTxHash) break;
      }
      
      if (deployTxHash) {
        const receipt = await publicClient.getTransactionReceipt({ hash: deployTxHash as `0x${string}` });
        txLogger.log({
          testName: "setup",
          description: "Deploy MockWETH",
          chain: "local",
          txHash: deployTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
      }
      
      const decimals = await mockWeth.read.decimals();
      assert.equal(decimals, 18, "WETH should have 18 decimals");
      console.log(`  ✅ MockWETH deployed: ${mockWeth.address}`);
    });

    it("Should deploy MockUSDC", async function () {
      const deploymentBlock = await publicClient.getBlockNumber();
      mockUsdc = await viem.deployContract("MockUSDC");
      
      const latestBlock = await publicClient.getBlockNumber();
      let deployTxHash: string | undefined;
      for (let i = deploymentBlock; i <= latestBlock; i++) {
        const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === null && tx.contractAddress?.toLowerCase() === mockUsdc.address.toLowerCase()) {
            deployTxHash = tx.hash;
            break;
          }
        }
        if (deployTxHash) break;
      }
      
      if (deployTxHash) {
        const receipt = await publicClient.getTransactionReceipt({ hash: deployTxHash as `0x${string}` });
        txLogger.log({
          testName: "setup",
          description: "Deploy MockUSDC",
          chain: "local",
          txHash: deployTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
      }
      
      const decimals = await mockUsdc.read.decimals();
      assert.equal(decimals, 6, "USDC should have 6 decimals");
      console.log(`  ✅ MockUSDC deployed: ${mockUsdc.address}`);
    });

    it("Should deploy MockLendingPool", async function () {
      const deploymentBlock = await publicClient.getBlockNumber();
      mockPool = await viem.deployContract("MockLendingPool", [mockOracle.address]);
      
      const latestBlock = await publicClient.getBlockNumber();
      let deployTxHash: string | undefined;
      for (let i = deploymentBlock; i <= latestBlock; i++) {
        const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === null && tx.contractAddress?.toLowerCase() === mockPool.address.toLowerCase()) {
            deployTxHash = tx.hash;
            break;
          }
        }
        if (deployTxHash) break;
      }
      
      if (deployTxHash) {
        const receipt = await publicClient.getTransactionReceipt({ hash: deployTxHash as `0x${string}` });
        txLogger.log({
          testName: "setup",
          description: "Deploy MockLendingPool",
          chain: "local",
          txHash: deployTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
      }
      
      const oracle = await mockPool.read.oracle();
      assert.equal(oracle.toLowerCase(), mockOracle.address.toLowerCase(), "Pool should have correct oracle");
      console.log(`  ✅ MockLendingPool deployed: ${mockPool.address}`);
    });

    it("Should deploy ReactiveVault with correct parameters", async function () {
      const deploymentBlock = await publicClient.getBlockNumber();
      vault = await viem.deployContract("ReactiveVault", [
        mockPool.address,
        mockWeth.address,
        mockUsdc.address,
        deployer.account.address, // reactiveVmId
      ]);
      
      const latestBlock = await publicClient.getBlockNumber();
      let deployTxHash: string | undefined;
      for (let i = deploymentBlock; i <= latestBlock; i++) {
        const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === null && tx.contractAddress?.toLowerCase() === vault.address.toLowerCase()) {
            deployTxHash = tx.hash;
            break;
          }
        }
        if (deployTxHash) break;
      }
      
      if (deployTxHash) {
        const receipt = await publicClient.getTransactionReceipt({ hash: deployTxHash as `0x${string}` });
        txLogger.log({
          testName: "setup",
          description: "Deploy ReactiveVault",
          chain: "local",
          txHash: deployTxHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
      }
      
      // Verify constants
      const maxLoops = await vault.read.MAX_LOOPS();
      const targetLtv = await vault.read.TARGET_LTV();
      const maxSlippage = await vault.read.MAX_SLIPPAGE_BPS();
      const callbackProxy = await vault.read.CALLBACK_PROXY();
      
      assert.equal(maxLoops, 5, "MAX_LOOPS should be 5");
      assert.equal(targetLtv, 70n, "TARGET_LTV should be 70");
      assert.equal(maxSlippage, 100n, "MAX_SLIPPAGE_BPS should be 100 (1%)");
      assert.equal(callbackProxy.toLowerCase(), CALLBACK_PROXY.toLowerCase(), "CALLBACK_PROXY should match");
      
      // Verify immutables
      const pool = await vault.read.POOL();
      const collateralToken = await vault.read.collateralToken();
      const loanToken = await vault.read.loanToken();
      const reactiveVmId = await vault.read.reactiveVmId();
      
      assert.equal(pool.toLowerCase(), mockPool.address.toLowerCase(), "POOL should match");
      assert.equal(collateralToken.toLowerCase(), mockWeth.address.toLowerCase(), "Collateral token should be WETH");
      assert.equal(loanToken.toLowerCase(), mockUsdc.address.toLowerCase(), "Loan token should be USDC");
      assert.equal(reactiveVmId.toLowerCase(), deployer.account.address.toLowerCase(), "reactiveVmId should match");
      
      console.log(`  ✅ ReactiveVault deployed: ${vault.address}`);
    });

    it("Should seed pool with liquidity", async function () {
      const hash = await mockPool.write.seedLiquidity([mockUsdc.address, LIQUIDITY_AMOUNT]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      txLogger.log({
        testName: "setup",
        description: "Seed pool with USDC liquidity",
        chain: "local",
        txHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: "success",
      });
      
      const liquidity = await mockPool.read.totalLiquidity([mockUsdc.address]);
      assert.equal(liquidity, LIQUIDITY_AMOUNT, "Pool should have seeded liquidity");
      console.log(`  ✅ Pool seeded with ${formatUnits(LIQUIDITY_AMOUNT, 6)} USDC`);
    });

    it("Should mint WETH to user", async function () {
      const hash = await mockWeth.write.mint([user.account.address, DEPOSIT_AMOUNT * 10n]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      txLogger.log({
        testName: "setup",
        description: "Mint WETH to user",
        chain: "local",
        txHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: "success",
      });
      
      const balance = await mockWeth.read.balanceOf([user.account.address]);
      assert.equal(balance, DEPOSIT_AMOUNT * 10n, "User should have WETH");
      console.log(`  ✅ User balance: ${formatEther(balance)} WETH`);
    });
  });

  // Test deposit function
  describe("Deposit Function", async function () {
    it("Should emit Deposit event when user deposits", async function () {
      // Approve first
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      
      // Deposit and verify event
      const deploymentBlock = await publicClient.getBlockNumber();
      const depositHash = await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
      
      // Verify event was emitted
      const events = await publicClient.getContractEvents({
        address: vault.address,
        abi: vault.abi,
        eventName: "Deposit",
        fromBlock: deploymentBlock,
      });
      
      assert.equal(events.length, 1, "Should emit one Deposit event");
      assert.equal(events[0].args.user?.toLowerCase(), user.account.address.toLowerCase(), "Event user should match");
      assert.equal(events[0].args.amount, DEPOSIT_AMOUNT, "Event amount should match");
      
      // Log TX hash
      txLogger.log({
        testName: "deposit",
        description: "User deposits WETH",
        chain: "local",
        txHash: depositHash,
        blockNumber: depositReceipt.blockNumber,
        gasUsed: depositReceipt.gasUsed,
        status: "success",
      });
      
      console.log(`  ✅ Deposit event emitted correctly`);
    });

    it("Should reset loopCount to 0 on deposit", async function () {
      const position = await vault.read.getPosition();
      assert.equal(Number(position[2]), 0, "Loop count should be 0 after deposit");
      console.log(`  ✅ Loop count reset to 0`);
    });

    it("Should supply collateral to pool on deposit", async function () {
      const position = await vault.read.getPosition();
      assert.equal(position[0], DEPOSIT_AMOUNT, "Collateral should match deposit");
      assert.equal(position[1], 0n, "Debt should be zero initially");
      console.log(`  ✅ Position: ${formatEther(position[0])} WETH collateral, ${formatUnits(position[1], 6)} USDC debt`);
    });

    it("Should revert on zero deposit amount", async function () {
      await assert.rejects(
        async () => {
          await vault.write.deposit([0n], { account: user.account });
        },
        (error: any) => {
          return error.message.includes("InvalidAmount") || error.message.includes("revert");
        },
        "Should revert with InvalidAmount"
      );
      console.log(`  ✅ Zero deposit correctly reverted`);
    });
  });

  // Test executeLoop function
  describe("ExecuteLoop Function", async function () {
    it("Should impersonate CALLBACK_PROXY for testing", async function () {
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      console.log(`  ✅ CALLBACK_PROXY impersonated`);
    });

    it("Should execute all 5 loops successfully", async function () {
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      const deploymentBlock = await publicClient.getBlockNumber();
      
      for (let i = 1; i <= 5; i++) {
        console.log(`\n  🔄 Executing loop ${i}/5...`);
        
        // Get position before
        const positionBefore = await vault.read.getPosition();
        const accountDataBefore = await mockPool.read.getUserAccountData([
          vault.address,
          mockWeth.address,
          mockUsdc.address,
        ]);
        
        // Execute loop
        const hash = await vault.write.executeLoop([deployer.account.address], {
          account: callbackProxy.account,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        
        txLogger.log({
          testName: "executeLoop",
          description: `Execute loop iteration ${i}`,
          chain: "local",
          txHash: hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
          status: "success",
        });
        
        // Verify LoopStep event
        const events = await publicClient.getContractEvents({
          address: vault.address,
          abi: vault.abi,
          eventName: "LoopStep",
          fromBlock: deploymentBlock,
        });
        
        const loopEvents = events.filter(e => e.args.iteration === i);
        assert.equal(loopEvents.length, 1, `Should emit LoopStep event for loop ${i}`);
        assert.equal(loopEvents[0].args.iteration, i, `Iteration should be ${i}`);
        assert.ok(loopEvents[0].args.borrowedAmount > 0n, "Borrowed amount should be > 0");
        assert.ok(loopEvents[0].args.mintedCollateral > 0n, "Minted collateral should be > 0");
        
        // Verify position increased
        const positionAfter = await vault.read.getPosition();
        assert.ok(positionAfter[0] > positionBefore[0], `Loop ${i}: Collateral should increase`);
        assert.ok(positionAfter[1] > positionBefore[1], `Loop ${i}: Debt should increase`);
        assert.equal(Number(positionAfter[2]), i, `Loop count should be ${i}`);
        
        // Verify health factor is safe
        const accountDataAfter = await mockPool.read.getUserAccountData([
          vault.address,
          mockWeth.address,
          mockUsdc.address,
        ]);
        assert.ok(accountDataAfter[3] >= 1200000000000000000n, `Loop ${i}: Health factor should be >= 1.2`);
        
        console.log(`    ✅ Loop ${i} completed:`);
        console.log(`       Collateral: ${formatEther(positionAfter[0])} WETH`);
        console.log(`       Debt: ${formatUnits(positionAfter[1], 6)} USDC`);
        console.log(`       Health Factor: ${formatEther(accountDataAfter[3])}`);
        console.log(`       Borrowed: ${formatUnits(loopEvents[0].args.borrowedAmount, 6)} USDC`);
      }
      
      // Final verification
      const finalPosition = await vault.read.getPosition();
      assert.equal(Number(finalPosition[2]), 5, "All 5 loops should complete");
      console.log(`\n  ✅ All 5 loops executed successfully!`);
    });

    it("Should revert on 6th loop (max loops reached)", async function () {
      // Create a fresh position for this test (previous test already used 5 loops)
      // First, unwind any existing position to reset state
      const testClientUnwind = await viem.getTestClient();
      await testClientUnwind.impersonateAccount({ address: CALLBACK_PROXY });
      await testClientUnwind.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxyUnwind = await viem.getWalletClient({ address: CALLBACK_PROXY });
      
      // Check if there's an existing position and unwind it
      const existingPosition = await vault.read.getPosition();
      if (existingPosition[1] > 0n || existingPosition[0] > 0n) {
        try {
          await vault.write.unwind([deployer.account.address], {
            account: callbackProxyUnwind.account,
          });
        } catch (e) {
          // Ignore if unwind fails
        }
      }
      
      // Now create fresh position
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      
      // Execute 5 loops first
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      
      for (let i = 1; i <= 5; i++) {
        await vault.write.executeLoop([deployer.account.address], {
          account: callbackProxy.account,
        });
      }
      
      // Now try 6th loop - should revert
      await assert.rejects(
        async () => {
          await vault.write.executeLoop([deployer.account.address], {
            account: callbackProxy.account,
          });
        },
        (error: any) => {
          return error.message.includes("MaxLoopsReached") || error.message.includes("revert");
        },
        "Should revert with MaxLoopsReached"
      );
      
      txLogger.log({
        testName: "executeLoop",
        description: "6th loop execution reverted (max loops reached)",
        chain: "local",
        txHash: "N/A - Reverted",
        status: "failed",
      });
      
      console.log(`  ✅ 6th loop correctly reverted`);
    });

    it("Should revert on unauthorized caller", async function () {
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
        testName: "executeLoop",
        description: "Unauthorized executeLoop call reverted",
        chain: "local",
        txHash: "N/A - Reverted",
        status: "failed",
      });
      
      console.log(`  ✅ Unauthorized call correctly reverted`);
    });
  });

  // Test unwind function
  describe("Unwind Function", async function () {
    it("Should unwind position completely", async function () {
      // First, create a new position
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      
      // Execute 3 loops
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      
      for (let i = 1; i <= 3; i++) {
        await vault.write.executeLoop([deployer.account.address], {
          account: callbackProxy.account,
        });
      }
      
      const positionBefore = await vault.read.getPosition();
      console.log(`\n  📊 Position before unwind:`);
      console.log(`     Collateral: ${formatEther(positionBefore[0])} WETH`);
      console.log(`     Debt: ${formatUnits(positionBefore[1], 6)} USDC`);
      
      // Unwind
      const deploymentBlock = await publicClient.getBlockNumber();
      const hash = await vault.write.unwind([deployer.account.address], {
        account: callbackProxy.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      txLogger.log({
        testName: "unwind",
        description: "Unwind leveraged position",
        chain: "local",
        txHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: "success",
      });
      
      // Verify Unwind event
      await viem.assertions.emitWithArgs(
        Promise.resolve({ hash }),
        vault,
        "Unwind",
        [positionBefore[1], positionBefore[0]], // repaidDebt, withdrawnCollateral
      );
      
      // Verify position cleared
      const positionAfter = await vault.read.getPosition();
      assert.equal(positionAfter[0], 0n, "Collateral should be zero");
      assert.equal(positionAfter[1], 0n, "Debt should be zero");
      assert.equal(Number(positionAfter[2]), 0, "Loop count should be reset");
      
      // Verify vault has recovered collateral
      const vaultBalance = await mockWeth.read.balanceOf([vault.address]);
      assert.equal(vaultBalance, positionBefore[0], "Vault should hold recovered collateral");
      
      console.log(`  ✅ Unwind successful:`);
      console.log(`     Repaid: ${formatUnits(positionBefore[1], 6)} USDC`);
      console.log(`     Withdrawn: ${formatEther(positionBefore[0])} WETH`);
      console.log(`     Vault balance: ${formatEther(vaultBalance)} WETH`);
    });

    it("Should handle unwind with zero debt", async function () {
      // Deposit without looping
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      const hash = await vault.write.unwind([deployer.account.address], {
        account: callbackProxy.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      txLogger.log({
        testName: "unwind",
        description: "Unwind with zero debt",
        chain: "local",
        txHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: "success",
      });
      
      // Verify Unwind event with zero debt
      const events = await publicClient.getContractEvents({
        address: vault.address,
        abi: vault.abi,
        eventName: "Unwind",
        fromBlock: receipt.blockNumber,
      });
      
      assert.equal(events.length, 1, "Should emit Unwind event");
      assert.equal(events[0].args.repaidDebt, 0n, "Repaid debt should be zero");
      assert.equal(events[0].args.withdrawnCollateral, DEPOSIT_AMOUNT, "Withdrawn collateral should match deposit");
      
      console.log(`  ✅ Unwind with zero debt handled correctly`);
    });
  });

  // Test getPosition function
  describe("GetPosition Function", async function () {
    it("Should return correct position data", async function () {
      // Create a position
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      
      await vault.write.executeLoop([deployer.account.address], {
        account: callbackProxy.account,
      });
      
      const position = await vault.read.getPosition();
      
      // Verify all fields
      assert.ok(position[0] > 0n, "Collateral should be > 0");
      assert.ok(position[1] > 0n, "Debt should be > 0");
      assert.equal(Number(position[2]), 1, "Loop count should be 1");
      assert.ok(position[3] >= 1200000000000000000n, "Health factor should be >= 1.2");
      
      console.log(`  ✅ Position data correct:`);
      console.log(`     Collateral: ${formatEther(position[0])} WETH`);
      console.log(`     Debt: ${formatUnits(position[1], 6)} USDC`);
      console.log(`     Loop Count: ${position[2]}`);
      console.log(`     Health Factor: ${formatEther(position[3])}`);
    });
  });

  // Test pay function
  describe("Pay Function", async function () {
    it("Should accept ETH payments", async function () {
      const amount = parseEther("0.1");
      const balanceBefore = await publicClient.getBalance({ address: vault.address });
      
      const hash = await deployer.sendTransaction({
        to: vault.address,
        value: amount,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      txLogger.log({
        testName: "pay",
        description: "Send ETH to vault (pay function)",
        chain: "local",
        txHash: hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: "success",
      });
      
      const balanceAfter = await publicClient.getBalance({ address: vault.address });
      assert.equal(balanceAfter - balanceBefore, amount, "Vault should receive ETH");
      console.log(`  ✅ Vault received ${formatEther(amount)} ETH`);
    });
  });

  // Test price crash scenario
  describe("Price Crash & Emergency Unwind", async function () {
    it("Should handle price crash and emergency unwind", async function () {
      // Setup position
      await mockWeth.write.approve([vault.address, DEPOSIT_AMOUNT], {
        account: user.account,
      });
      await vault.write.deposit([DEPOSIT_AMOUNT], { account: user.account });
      
      // Impersonate CALLBACK_PROXY
      const testClient = await viem.getTestClient();
      await testClient.impersonateAccount({ address: CALLBACK_PROXY });
      await testClient.setBalance({ address: CALLBACK_PROXY, value: parseEther("100") });
      const callbackProxy = await viem.getWalletClient({ address: CALLBACK_PROXY });
      
      for (let i = 1; i <= 3; i++) {
        await vault.write.executeLoop([deployer.account.address], {
          account: callbackProxy.account,
        });
      }
      
      const positionBefore = await vault.read.getPosition();
      console.log(`\n  📊 Position before crash:`);
      console.log(`     Collateral: ${formatEther(positionBefore[0])} WETH`);
      console.log(`     Debt: ${formatUnits(positionBefore[1], 6)} USDC`);
      console.log(`     Health Factor: ${formatEther(positionBefore[3])}`);
      
      // Crash price (50% drop: $3000 -> $1500)
      console.log(`\n  💥 Crashing price from $3000 to $1500...`);
      const crashPrice = 1500n * 10n**36n;
      const crashHash = await mockOracle.write.setPrice([crashPrice]);
      const crashReceipt = await publicClient.waitForTransactionReceipt({ hash: crashHash });
      
      txLogger.log({
        testName: "price-crash",
        description: "Oracle price crash (50% drop)",
        chain: "local",
        txHash: crashHash,
        blockNumber: crashReceipt.blockNumber,
        gasUsed: crashReceipt.gasUsed,
        status: "success",
      });
      
      // Verify health factor dropped
      const accountDataAfterCrash = await mockPool.read.getUserAccountData([
        vault.address,
        mockWeth.address,
        mockUsdc.address,
      ]);
      
      console.log(`     Health factor after crash: ${formatEther(accountDataAfterCrash[3])}`);
      assert.ok(accountDataAfterCrash[3] < positionBefore[3], "Health factor should decrease");
      
      // Emergency unwind
      console.log(`\n  🔄 Executing emergency unwind...`);
      const unwindHash = await vault.write.unwind([deployer.account.address], {
        account: callbackProxy.account,
      });
      const unwindReceipt = await publicClient.waitForTransactionReceipt({ hash: unwindHash });
      
      txLogger.log({
        testName: "price-crash",
        description: "Emergency unwind after price crash",
        chain: "local",
        txHash: unwindHash,
        blockNumber: unwindReceipt.blockNumber,
        gasUsed: unwindReceipt.gasUsed,
        status: "success",
      });
      
      // Verify position cleared
      const positionAfter = await vault.read.getPosition();
      assert.equal(positionAfter[0], 0n, "Collateral should be zero");
      assert.equal(positionAfter[1], 0n, "Debt should be zero");
      
      console.log(`  ✅ Emergency unwind successful after price crash`);
    });
  });

  // Save all transaction hashes
  it("Save all transaction hashes to file", async function () {
    txLogger.save("ReactiveVault-Full-TX-Hashes.json");
    console.log(`\n✅ Test suite completed! All transaction hashes saved.`);
  });
});
