/**
 * @title Fund Brain Script
 * @notice Funds ShieldBrain on Reactive Network via System Contract
 * @dev The brain needs lReact tokens to pay for RVM execution gas
 * 
 * Usage:
 *   npx tsx scripts/fund-brain.ts
 * 
 * Prerequisites:
 *   - Set PRIVATE_KEY in .env
 *   - Set REACTIVE_RPC_URL in .env
 *   - Set SHIELD_BRAIN_ADDRESS in .env
 *   - Wallet must have at least 1.1 lReact on Reactive Network (1.0 + gas)
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============ Configuration ============

const SYSTEM_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000fffFfF' as const;
const FUNDING_AMOUNT = parseEther('1.0'); // 1.0 lReact

// Define Reactive Network (Lasna)
const reactiveLasna = defineChain({
  id: 5318007,
  name: 'Reactive Lasna',
  nativeCurrency: {
    name: 'lReact',
    symbol: 'lReact',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.lasna.reactive.network'],
    },
    public: {
      http: ['https://rpc.lasna.reactive.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Reactive Scan',
      url: 'https://lasna.reactscan.net',
    },
  },
  testnet: true,
});

// System Contract ABI (only depositTo function)
const SYSTEM_CONTRACT_ABI = [
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'depositTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ============ Main Function ============

async function fundBrain() {
  console.log('🧠 Starting Brain Funding Process...\n');

  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in .env');
  }
  if (!process.env.REACTIVE_RPC_URL) {
    throw new Error('REACTIVE_RPC_URL not set in .env');
  }
  if (!process.env.SHIELD_BRAIN_ADDRESS) {
    throw new Error('SHIELD_BRAIN_ADDRESS not set in .env');
  }

  const brainAddress = process.env.SHIELD_BRAIN_ADDRESS as `0x${string}`;

  console.log('📋 Configuration:');
  console.log(`   Network: Reactive Lasna (Chain ID: ${reactiveLasna.id})`);
  console.log(`   System Contract: ${SYSTEM_CONTRACT_ADDRESS}`);
  console.log(`   Brain Address: ${brainAddress}`);
  console.log(`   Funding Amount: ${formatEther(FUNDING_AMOUNT)} lReact\n`);

  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
  console.log(`👛 Wallet Address: ${account.address}\n`);

  // Create public client for reading
  const publicClient = createPublicClient({
    chain: reactiveLasna,
    transport: http(process.env.REACTIVE_RPC_URL),
  });

  // Create wallet client for transactions
  const walletClient = createWalletClient({
    account,
    chain: reactiveLasna,
    transport: http(process.env.REACTIVE_RPC_URL),
  });

  // Check wallet balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Wallet Balance: ${formatEther(balance)} lReact`);

  const requiredBalance = FUNDING_AMOUNT + parseEther('0.1'); // Funding + gas estimate
  if (balance < requiredBalance) {
    throw new Error(
      `Insufficient balance. Need at least ${formatEther(requiredBalance)} lReact, but have ${formatEther(balance)} lReact`
    );
  }

  // Check current brain balance
  console.log('\n🔍 Checking current brain balance...');
  const currentBrainBalance = await publicClient.getBalance({ address: brainAddress });
  console.log(`   Current Brain Balance: ${formatEther(currentBrainBalance)} lReact`);

  // Fund the brain via System Contract
  console.log('\n📤 Sending transaction to System Contract...');
  console.log(`   Depositing ${formatEther(FUNDING_AMOUNT)} lReact to brain...`);

  try {
    const hash = await walletClient.writeContract({
      address: SYSTEM_CONTRACT_ADDRESS,
      abi: SYSTEM_CONTRACT_ABI,
      functionName: 'depositTo',
      args: [brainAddress],
      value: FUNDING_AMOUNT,
    });

    console.log(`\n✅ Transaction submitted!`);
    console.log(`   TX Hash: ${hash}`);
    console.log(`   Explorer: https://lasna.reactscan.net/tx/${hash}`);

    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`\n🎉 Transaction confirmed!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

      // Check new brain balance
      const newBrainBalance = await publicClient.getBalance({ address: brainAddress });
      console.log(`\n🧠 Updated Brain Balance: ${formatEther(newBrainBalance)} lReact`);
      console.log(`   Increase: +${formatEther(newBrainBalance - currentBrainBalance)} lReact`);

      console.log('\n✅ Brain funding complete! RVM ready for execution.\n');
      console.log(`🔗 Check status: https://lasna.reactscan.net/address/${brainAddress}\n`);
    } else {
      console.error('\n❌ Transaction failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error funding brain:', error);
    throw error;
  }
}

// ============ Execute ============

fundBrain()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


