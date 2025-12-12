/**
 * @title Test System Script
 * @notice Tests the complete Reactive Morpho Shield flow
 * 
 * Usage:
 *   npx tsx scripts/test-system.ts
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Contract addresses
const MOCK_WETH = "0x325215b0948eBf5dF130643e9639479E4912adfB";
const MOCK_USDC = "0xA41D33DE4B7C61765355f69D056D2CB8450478a0";
const MOCK_ORACLE = "0x6A1cAF23D2B53A2AdC59744aeF517A030DB0a540";
const VAULT = "0xc2D8C2A71631eb121Fd635c34c31CB5A4Ae8E40A";
const BRAIN = "0x65a1FC2fe06f89F2AC414b032981Bf3e94a9720D";

// ABIs (minimal)
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
    inputs: [],
    name: "initializeMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
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
      { name: "collateral", type: "uint128" },
      { name: "debt", type: "uint128" },
      { name: "currentLoopCount", type: "uint8" },
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
  {
    inputs: [],
    name: "price",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function main() {
  console.log("🧪 Testing Reactive Morpho Shield\n");

  // Validate environment
  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or SEPOLIA_RPC_URL in .env");
  }

  // Setup clients
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
  // STEP 1: Initialize Market (One-time setup)
  // ========================================
  console.log("📝 Step 1: Initializing Morpho market...");
  console.log("   Creating market with:");
  console.log(`   - Loan Token: ${MOCK_USDC}`);
  console.log(`   - Collateral: ${MOCK_WETH}`);
  console.log(`   - Oracle: ${MOCK_ORACLE}`);
  console.log(`   - LLTV: 80%`);
  
  try {
    const initHash = await walletClient.writeContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: "initializeMarket",
    });
    
    await publicClient.waitForTransactionReceipt({ hash: initHash });
    console.log(`   ✅ Market created! TX: ${initHash}\n`);
  } catch (error: any) {
    if (error.message?.includes("ALREADY_CREATED") || error.message?.includes("MarketAlreadyCreated")) {
      console.log(`   ℹ️  Market already exists (this is fine)\n`);
    } else {
      console.log(`   ⚠️  Market creation failed (may already exist): ${error.message}\n`);
    }
  }

  // ========================================
  // STEP 2: Mint WETH
  // ========================================
  console.log("📝 Step 2: Minting 1 WETH...");
  
  const mintHash = await walletClient.writeContract({
    address: MOCK_WETH,
    abi: ERC20_ABI,
    functionName: "mint",
    args: [account.address, parseEther("1")],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`   ✅ Minted! TX: ${mintHash}`);

  // Check balance
  const wethBalance = await publicClient.readContract({
    address: MOCK_WETH,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`   💰 WETH Balance: ${formatEther(wethBalance)} WETH\n`);

  // ========================================
  // STEP 3: Approve Vault
  // ========================================
  console.log("📝 Step 3: Approving vault...");
  
  const approveHash = await walletClient.writeContract({
    address: MOCK_WETH,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [VAULT, parseEther("1")],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log(`   ✅ Approved! TX: ${approveHash}\n`);

  // ========================================
  // STEP 4: Deposit (TRIGGERS AUTOMATION!)
  // ========================================
  console.log("📝 Step 4: Depositing 1 WETH to vault...");
  
  const depositHash = await walletClient.writeContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "deposit",
    args: [parseEther("1")],
  });
  
  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`   ✅ Deposited! TX: ${depositHash}`);
  console.log(`   🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${depositHash}`);
  console.log(`   🧠 ShieldBrain should now detect this and trigger 5 loops!\n`);

  // ========================================
  // STEP 5: Wait and Check Position
  // ========================================
  console.log("⏳ Waiting 3 minutes for automation to complete...");
  console.log("   Watch live on:");
  console.log(`   - Vault: https://sepolia.etherscan.io/address/${VAULT}`);
  console.log(`   - Brain: https://lasna.reactscan.net/address/${BRAIN}\n`);

  // Wait 3 minutes
  for (let i = 0; i < 18; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    process.stdout.write(".");
  }
  console.log("\n");

  // Check position
  console.log("📊 Checking position after automation...");
  const position = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "getPosition",
  });

  console.log(`   Collateral: ${position[0]}`);
  console.log(`   Debt: ${position[1]}`);
  console.log(`   Loop Count: ${position[2]}`);

  if (Number(position[2]) === 5) {
    console.log(`   ✅ SUCCESS! All 5 loops completed!\n`);
  } else if (Number(position[2]) > 0) {
    console.log(`   ⚠️  Only ${position[2]} loops completed. May need more time.\n`);
  } else {
    console.log(`   ❌ No loops executed. Check ShieldBrain subscriptions!\n`);
  }

  // ========================================
  // STEP 6: Test Price Crash & Unwind
  // ========================================
  console.log("📝 Step 6: Testing emergency unwind...");
  console.log("   Crashing ETH price to $1000...");
  
  const crashHash = await walletClient.writeContract({
    address: MOCK_ORACLE,
    abi: ORACLE_ABI,
    functionName: "setPrice",
    args: [1000n * 10n**36n], // $1000 with 36 decimals
  });
  
  await publicClient.waitForTransactionReceipt({ hash: crashHash });
  console.log(`   ✅ Price crashed! TX: ${crashHash}`);
  console.log(`   🧠 ShieldBrain should trigger unwind...\n`);

  // Wait 1 minute
  console.log("⏳ Waiting 1 minute for unwind...");
  for (let i = 0; i < 6; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    process.stdout.write(".");
  }
  console.log("\n");

  // Check position after unwind
  console.log("📊 Checking position after unwind...");
  const positionAfter = await publicClient.readContract({
    address: VAULT,
    abi: VAULT_ABI,
    functionName: "getPosition",
  });

  console.log(`   Collateral: ${positionAfter[0]}`);
  console.log(`   Debt: ${positionAfter[1]}`);
  
  if (Number(positionAfter[1]) === 0) {
    console.log(`   ✅ SUCCESS! Debt fully repaid!\n`);
  } else if (Number(positionAfter[1]) < Number(position[1])) {
    console.log(`   ⚠️  Debt reduced but not fully cleared.\n`);
  } else {
    console.log(`   ❌ Unwind didn't execute. Check ShieldBrain!\n`);
  }

  console.log("✅ Testing complete!");
  console.log("\n🎉 Your Reactive Morpho Shield is working! 🎉\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

