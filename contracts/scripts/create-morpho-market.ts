/**
 * @title Create Morpho Market Script
 * @notice Calls Morpho Blue directly to create the market
 * @dev Bypasses the vault and creates market directly on Morpho
 * 
 * Usage:
 *   npx tsx scripts/create-morpho-market.ts
 */

import { createPublicClient, createWalletClient, http, encodeAbiParameters } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// Addresses
const MORPHO = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
const MOCK_USDC = "0xA41D33DE4B7C61765355f69D056D2CB8450478a0";
const MOCK_WETH = "0x325215b0948eBf5dF130643e9639479E4912adfB";
const MOCK_ORACLE = "0x6A1cAF23D2B53A2AdC59744aeF517A030DB0a540";

// Morpho ABI
const MORPHO_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
        name: "marketParams",
        type: "tuple",
      },
    ],
    name: "createMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

async function main() {
  console.log("🏗️  Creating Morpho Blue Market Directly\n");

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

  // Market Parameters (matching ReactiveMorphoShield)
  const marketParams = {
    loanToken: MOCK_USDC,
    collateralToken: MOCK_WETH,
    oracle: MOCK_ORACLE,
    irm: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    lltv: 800000000000000000n, // 0.8e18 = 80%
  };

  console.log("📋 Market Parameters:");
  console.log(`   Loan Token (USDC):      ${marketParams.loanToken}`);
  console.log(`   Collateral Token (WETH): ${marketParams.collateralToken}`);
  console.log(`   Oracle:                 ${marketParams.oracle}`);
  console.log(`   Interest Rate Model:    ${marketParams.irm} (None)`);
  console.log(`   LLTV:                   ${marketParams.lltv} (80%)\n`);

  console.log("📝 Calling Morpho.createMarket()...");
  console.log(`   Morpho Blue: ${MORPHO}\n`);

  try {
    const hash = await walletClient.writeContract({
      address: MORPHO,
      abi: MORPHO_ABI,
      functionName: "createMarket",
      args: [marketParams],
    });

    console.log(`   ✅ Transaction submitted!`);
    console.log(`   TX Hash: ${hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "success") {
      console.log(`✅ Market created successfully!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${hash}\n`);
      
      console.log(`🎉 Market is ready! You can now test the system!`);
      console.log(`   Run: npx tsx scripts/test-system.ts\n`);
    } else {
      console.error(`❌ Transaction failed!`);
      process.exit(1);
    }
  } catch (error: any) {
    if (
      error.message?.includes("MARKET_ALREADY_CREATED") ||
      error.message?.includes("MarketAlreadyCreated") ||
      error.message?.includes("already exists")
    ) {
      console.log(`✅ Market already exists! This is good!\n`);
      console.log(`🎉 You can proceed with testing:`);
      console.log(`   Run: npx tsx scripts/test-system.ts\n`);
    } else {
      console.error(`\n❌ Error creating market:`);
      console.error(`   ${error.message}\n`);
      
      // Check if it's a different error
      if (error.message?.includes("UNAUTHORIZED_IRM")) {
        console.log(`💡 Tip: The IRM (Interest Rate Model) might need to be whitelisted.`);
        console.log(`   For address(0), Morpho might require a specific IRM contract.\n`);
      }
      
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

