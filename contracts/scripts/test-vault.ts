/**
 * @title Test Vault Script
 * @notice Tests ReactiveVault with MockLendingPool
 * 
 * Usage:
 *   npx tsx scripts/test-vault.ts
 */

import { createPublicClient, createWalletClient, http, parseEther, parseUnits, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// Addresses - all sourced from .env to avoid stale hardcodes
const MOCK_WETH = (process.env.MOCK_WETH_ADDRESS as `0x${string}`) || "0xMockWETH";
const MOCK_USDC = (process.env.MOCK_USDC_ADDRESS as `0x${string}`) || "0xMockUSDC";
const MOCK_ORACLE = (process.env.MOCK_ORACLE_ADDRESS as `0x${string}`) || "0xMockOracle";
const VAULT = (process.env.SHIELD_VAULT_ADDRESS as `0x${string}`) || "0xVault";
const BRAIN = (process.env.SHIELD_BRAIN_ADDRESS as `0x${string}`) || "0xBrain";

// ABIs
const ERC20_ABI = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getPosition",
    outputs: [
      { name: "collateral", type: "uint256" },
      { name: "debt", type: "uint256" },
      { name: "currentLoopCount", type: "uint8" },
      { name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const ORACLE_ABI = [
  {
    inputs: [{ name: "newPrice", type: "uint256" }],
    name: "setPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  console.log("🧪 Testing Reactive Vault with MockLendingPool\n");

  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or SEPOLIA_RPC_URL in .env");
  }

  if (!process.env.SHIELD_VAULT_ADDRESS) {
    throw new Error("Update SHIELD_VAULT_ADDRESS in .env!");
  }
  if (!process.env.MOCK_WETH_ADDRESS || !process.env.MOCK_USDC_ADDRESS || !process.env.MOCK_ORACLE_ADDRESS) {
    throw new Error("Update MOCK_WETH_ADDRESS / MOCK_USDC_ADDRESS / MOCK_ORACLE_ADDRESS in .env!");
  }

  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
  console.log(`👛 Wallet: ${account.address}\n`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // ========================================
  // STEP 1: Check/Mint WETH
  // ========================================
  console.log("📝 Step 1: Checking WETH balance...");
  
  let wethBalance = await publicClient.readContract({
    address: MOCK_WETH,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  
  console.log(`   Current Balance: ${formatUnits(wethBalance, 18)} WETH`);
  
  if (wethBalance < parseEther("1")) {
    console.log(`   Minting 1 WETH...`);
    
    const mintHash = await walletClient.writeContract({
      address: MOCK_WETH,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [account.address, parseEther("1")],
    });
    
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log(`   ✅ Minted! TX: ${mintHash}`);
    
    wethBalance = await publicClient.readContract({
      address: MOCK_WETH,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
  } else {
    console.log(`   ✅ Sufficient balance, skipping mint`);
  }
  
  console.log(`   💰 WETH Balance: ${formatUnits(wethBalance, 18)} WETH\n`);

  // ========================================
  // STEP 2: Approve Vault
  // ========================================
  console.log("📝 Step 2: Approving vault...");
  
  const approveHash = await walletClient.writeContract({
    address: MOCK_WETH,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [VAULT as `0x${string}`, parseEther("1")],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`   ✅ Approved! TX: ${approveHash}\n`);

  // ========================================
  // STEP 3: Deposit (TRIGGERS AUTOMATION!)
  // ========================================
  console.log("📝 Step 3: Depositing 1 WETH to vault...");
  
  const depositHash = await walletClient.writeContract({
    address: VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "deposit",
    args: [parseEther("1")],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`   ✅ Deposited! TX: ${depositHash}`);
  console.log(`   🔗 Etherscan: https://sepolia.etherscan.io/tx/${depositHash}`);
  console.log(`   🧠 ShieldBrain should now detect and trigger 5 loops!\n`);

  // ========================================
  // STEP 4: Monitor Automation
  // ========================================
  console.log("⏳ Monitoring automation (checking every 30 seconds)...");
  console.log(`   Vault: https://sepolia.etherscan.io/address/${VAULT}`);
  console.log(`   Brain: https://lasna.reactscan.net/address/${BRAIN}\n`);

  // Check position every 30 seconds for 3 minutes
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    
    const position = await publicClient.readContract({
      address: VAULT as `0x${string}`,
      abi: VAULT_ABI,
      functionName: "getPosition",
    });

    console.log(`   [${i + 1}/6] Loop Count: ${position[2]}, Debt: ${formatUnits(position[1], 6)} USDC`);
    
    if (Number(position[2]) === 5) {
      console.log(`   ✅ All 5 loops completed!\n`);
      break;
    }
  }

  // Final position check
  console.log("📊 Final Position After Looping:");
  const position = await publicClient.readContract({
    address: VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "getPosition",
  });

  console.log(`   Collateral: ${formatUnits(position[0], 18)} WETH`);
  console.log(`   Debt: ${formatUnits(position[1], 6)} USDC`);
  console.log(`   Loop Count: ${position[2]}`);
  console.log(`   Health Factor: ${Number(position[3]) / 1e18}\n`);

  if (Number(position[2]) === 5) {
    console.log(`✅ LEVERAGE AUTOMATION SUCCESSFUL!\n`);
  } else {
    console.log(`⚠️  Only ${position[2]} loops completed. Check ShieldBrain!\n`);
  }

  // ========================================
  // STEP 5: Test Emergency Unwind
  // ========================================
  console.log("📝 Step 5: Testing emergency unwind...");
  console.log("   Crashing ETH price to $1000...\n");
  
  const crashHash = await walletClient.writeContract({
    address: MOCK_ORACLE,
    abi: ORACLE_ABI,
    functionName: "setPrice",
    args: [1000n * 10n**36n],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: crashHash });
  console.log(`   ✅ Price crashed! TX: ${crashHash}`);
  console.log(`   🧠 ShieldBrain should trigger unwind...\n`);

  // Monitor unwind
  console.log("⏳ Waiting for unwind (checking every 15 seconds)...");
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
    
    const posAfter = await publicClient.readContract({
      address: VAULT as `0x${string}`,
      abi: VAULT_ABI,
      functionName: "getPosition",
    });

    console.log(`   [${i + 1}/8] Debt: ${formatUnits(posAfter[1], 6)} USDC`);
    
    if (Number(posAfter[1]) === 0) {
      console.log(`   ✅ Debt fully repaid!\n`);
      break;
    }
  }

  // Final check
  const finalPosition = await publicClient.readContract({
    address: VAULT as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "getPosition",
  });

  console.log("📊 Final Position After Unwind:");
  console.log(`   Collateral: ${formatUnits(finalPosition[0], 18)} WETH`);
  console.log(`   Debt: ${formatUnits(finalPosition[1], 6)} USDC`);
  console.log(`   Health Factor: ${Number(finalPosition[3]) / 1e18}\n`);

  if (Number(finalPosition[1]) === 0) {
    console.log(`✅ EMERGENCY UNWIND SUCCESSFUL!\n`);
  } else {
    console.log(`⚠️  Debt not fully cleared. Check ShieldBrain!\n`);
  }

  console.log("🎉 Testing Complete! Your Reactive Vault is Working! 🎉\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

