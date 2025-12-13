/**
 * @title Debug Deposit
 * @notice Gets the actual revert reason from vault.deposit()
 */

import hre from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("🔍 Debugging ReactiveVault.deposit() revert\n");

  const [signer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const vaultAddress = process.env.SHIELD_VAULT_ADDRESS as `0x${string}`;
  const poolAddress = process.env.POOL_ADDRESS as `0x${string}`;
  const wethAddress = "0x325215b0948eBf5dF130643e9639479E4912adfB" as `0x${string}`;

  console.log(`👛 Wallet: ${signer.account.address}`);
  console.log(`🏦 Vault: ${vaultAddress}`);
  console.log(`💧 Pool: ${poolAddress}`);
  console.log(`💰 WETH: ${wethAddress}\n`);

  // Get contracts
  const vault = await hre.viem.getContractAt("ReactiveVault", vaultAddress);
  const pool = await hre.viem.getContractAt("MockLendingPool", poolAddress);
  const weth = await hre.viem.getContractAt("MockWETH", wethAddress);

  // Check balances
  console.log("📊 Current State:");
  const userWeth = await weth.read.balanceOf([signer.account.address]);
  const userAllowance = await weth.read.allowance([signer.account.address, vaultAddress]);
  console.log(`   User WETH Balance: ${hre.viem.formatEther(userWeth)} WETH`);
  console.log(`   User → Vault Allowance: ${hre.viem.formatEther(userAllowance)} WETH`);

  // Check vault's stored addresses
  const vaultPool = await vault.read.POOL();
  const vaultCollateral = await vault.read.collateralToken();
  const vaultLoan = await vault.read.loanToken();
  console.log(`\n🔍 Vault Configuration:`);
  console.log(`   Pool Address: ${vaultPool}`);
  console.log(`   Collateral Token: ${vaultCollateral}`);
  console.log(`   Loan Token: ${vaultLoan}`);

  // Verify addresses match
  if (vaultPool.toLowerCase() !== poolAddress.toLowerCase()) {
    console.log(`   ❌ MISMATCH: Vault pool (${vaultPool}) != actual pool (${poolAddress})`);
  }
  if (vaultCollateral.toLowerCase() !== wethAddress.toLowerCase()) {
    console.log(`   ❌ MISMATCH: Vault collateral (${vaultCollateral}) != WETH (${wethAddress})`);
  }

  // Try to simulate the deposit
  console.log(`\n🧪 Simulating deposit(1 WETH)...`);
  try {
    await publicClient.simulateContract({
      address: vaultAddress,
      abi: vault.abi,
      functionName: 'deposit',
      args: [hre.viem.parseEther("1")],
      account: signer.account.address,
    });
    console.log(`   ✅ Simulation passed! (This is unexpected)`);
  } catch (error: any) {
    console.log(`   ❌ Simulation FAILED!`);
    console.log(`\n📛 Revert Reason:`);
    
    if (error.cause && error.cause.reason) {
      console.log(`   ${error.cause.reason}`);
    } else if (error.details) {
      console.log(`   ${error.details}`);
    } else if (error.message) {
      console.log(`   ${error.message}`);
    } else {
      console.log(`   ${JSON.stringify(error, null, 2)}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



