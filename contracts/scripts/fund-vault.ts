/**
 * @title Fund Vault Script
 * @notice Funds ReactiveMorphoShield on Ethereum Sepolia via Callback Proxy
 * @dev The vault needs ETH to pay for callback execution gas
 * 
 * Usage:
 *   npx tsx scripts/fund-vault.ts
 * 
 * Prerequisites:
 *   - Set PRIVATE_KEY in .env
 *   - Set SEPOLIA_RPC_URL in .env
 *   - Set SHIELD_VAULT_ADDRESS in .env
 *   - Wallet must have at least 0.03 ETH on Sepolia (0.02 + gas)
 */

import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============ Configuration ============

const CALLBACK_PROXY_ADDRESS = '0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA' as const;
const FUNDING_AMOUNT = parseEther('0.02'); // 0.02 ETH

// Callback Proxy ABI (only depositTo function)
const CALLBACK_PROXY_ABI = [
  {
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'depositTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ============ Main Function ============

async function fundVault() {
  console.log('🚀 Starting Vault Funding Process...\n');

  // Validate environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not set in .env');
  }
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error('SEPOLIA_RPC_URL not set in .env');
  }
  if (!process.env.SHIELD_VAULT_ADDRESS) {
    throw new Error('SHIELD_VAULT_ADDRESS not set in .env');
  }

  const vaultAddress = process.env.SHIELD_VAULT_ADDRESS as `0x${string}`;

  console.log('📋 Configuration:');
  console.log(`   Network: Ethereum Sepolia (Chain ID: ${sepolia.id})`);
  console.log(`   Callback Proxy: ${CALLBACK_PROXY_ADDRESS}`);
  console.log(`   Vault Address: ${vaultAddress}`);
  console.log(`   Funding Amount: ${formatEther(FUNDING_AMOUNT)} ETH\n`);

  // Create account from private key
  const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as `0x${string}`);
  console.log(`👛 Wallet Address: ${account.address}\n`);

  // Create public client for reading
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // Create wallet client for transactions
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // Check wallet balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Wallet Balance: ${formatEther(balance)} ETH`);

  const requiredBalance = FUNDING_AMOUNT + parseEther('0.001'); // Funding + gas estimate
  if (balance < requiredBalance) {
    throw new Error(
      `Insufficient balance. Need at least ${formatEther(requiredBalance)} ETH, but have ${formatEther(balance)} ETH`
    );
  }

  // Check current vault balance
  console.log('\n🔍 Checking current vault balance...');
  const currentVaultBalance = await publicClient.getBalance({ address: vaultAddress });
  console.log(`   Current Vault Balance: ${formatEther(currentVaultBalance)} ETH`);

  // Fund the vault via Callback Proxy
  console.log('\n📤 Sending transaction to Callback Proxy...');
  console.log(`   Depositing ${formatEther(FUNDING_AMOUNT)} ETH to vault...`);

  try {
    const hash = await walletClient.writeContract({
      address: CALLBACK_PROXY_ADDRESS,
      abi: CALLBACK_PROXY_ABI,
      functionName: 'depositTo',
      args: [vaultAddress],
      value: FUNDING_AMOUNT,
    });

    console.log(`\n✅ Transaction submitted!`);
    console.log(`   TX Hash: ${hash}`);
    console.log(`   Explorer: https://sepolia.etherscan.io/tx/${hash}`);

    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      console.log(`\n🎉 Transaction confirmed!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

      // Check new vault balance
      const newVaultBalance = await publicClient.getBalance({ address: vaultAddress });
      console.log(`\n💎 Updated Vault Balance: ${formatEther(newVaultBalance)} ETH`);
      console.log(`   Increase: +${formatEther(newVaultBalance - currentVaultBalance)} ETH`);

      console.log('\n✅ Vault funding complete! Ready for callbacks.\n');
    } else {
      console.error('\n❌ Transaction failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error funding vault:', error);
    throw error;
  }
}

// ============ Execute ============

fundVault()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


