/**
 * @title Seed Liquidity Script
 * @notice Seeds MockLendingPool with USDC liquidity for borrowing
 * @dev Must be run before testing (pool needs liquidity to lend)
 * 
 * Usage:
 *   npx tsx scripts/seed-liquidity.ts
 */

import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// Addresses - from .env
const POOL_ADDRESS = process.env.POOL_ADDRESS;
const MOCK_USDC = process.env.MOCK_USDC_ADDRESS || "0x65a1FC2fe06f89F2AC414b032981Bf3e94a9720D";

const POOL_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "seedLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  console.log("💧 Seeding MockLendingPool with USDC Liquidity\n");

  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or SEPOLIA_RPC_URL in .env");
  }

  if (POOL_ADDRESS === "YOUR_POOL_ADDRESS_HERE") {
    throw new Error("Update POOL_ADDRESS in .env or in this script!");
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

  // Seed 10,000 USDC (enough for multiple test runs)
  const seedAmount = parseUnits("10000", 6); // 10,000 USDC (6 decimals)

  console.log("📋 Seeding Configuration:");
  console.log(`   Pool: ${POOL_ADDRESS}`);
  console.log(`   Token: ${MOCK_USDC} (MockUSDC)`);
  console.log(`   Amount: 10,000 USDC\n`);

  console.log("📝 Calling pool.seedLiquidity()...");
  console.log("   This will mint USDC to the pool for borrowing\n");

  try {
    const hash = await walletClient.writeContract({
      address: POOL_ADDRESS as `0x${string}`,
      abi: POOL_ABI,
      functionName: "seedLiquidity",
      args: [MOCK_USDC, seedAmount],
    });

    console.log(`   ✅ Transaction submitted!`);
    console.log(`   TX Hash: ${hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(`✅ Liquidity seeded successfully!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${hash}\n`);
      
      console.log(`🎉 Pool has 10,000 USDC available for borrowing!`);
      console.log(`   You can now test the looping system!\n`);
    } else {
      console.error(`❌ Transaction failed!`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Error seeding liquidity:`);
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

