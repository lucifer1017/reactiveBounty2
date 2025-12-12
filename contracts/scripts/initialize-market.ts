/**
 * @title Initialize Market Script
 * @notice One-time setup to create the Morpho market
 * 
 * Usage:
 *   npx tsx scripts/initialize-market.ts
 */

import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

const VAULT = "0xc2D8C2A71631eb121Fd635c34c31CB5A4Ae8E40A";

const VAULT_ABI = [
  {
    inputs: [],
    name: "initializeMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  console.log("🔧 Initializing Morpho Market\n");

  if (!process.env.PRIVATE_KEY || !process.env.SEPOLIA_RPC_URL) {
    throw new Error("Missing PRIVATE_KEY or SEPOLIA_RPC_URL in .env");
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

  console.log("📝 Creating Morpho market...");
  console.log(`   Vault: ${VAULT}`);
  
  try {
    const hash = await walletClient.writeContract({
      address: VAULT,
      abi: VAULT_ABI,
      functionName: "initializeMarket",
    });

    console.log(`   TX Hash: ${hash}`);
    console.log(`   Waiting for confirmation...\n`);

    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`✅ Market created successfully!`);
    console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${hash}\n`);
    console.log(`🎉 You can now run the test script!`);
    console.log(`   npx tsx scripts/test-system.ts\n`);
  } catch (error: any) {
    if (error.message?.includes("ALREADY_CREATED") || error.message?.includes("MarketAlreadyCreated")) {
      console.log(`✅ Market already exists! You're good to go!\n`);
      console.log(`🎉 Run the test script:`);
      console.log(`   npx tsx scripts/test-system.ts\n`);
    } else {
      console.error(`❌ Error: ${error.message}\n`);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

