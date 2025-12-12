/**
 * @title Quick Status Check
 * @notice Checks all contract balances and states
 */

import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

const POOL_ADDRESS = process.env.POOL_ADDRESS!;
const VAULT_ADDRESS = process.env.SHIELD_VAULT_ADDRESS!;
const MOCK_USDC = "0xA41D33DE4B7C61765355f69D056D2CB8450478a0";

const POOL_ABI = [
  {
    inputs: [{ name: "token", type: "address" }],
    name: "totalLiquidity",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const VAULT_ABI = [
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

async function main() {
  console.log("📊 System Status Check\n");

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  });

  // Check pool liquidity
  console.log("🏦 MockLendingPool:");
  const liquidity = await publicClient.readContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: "totalLiquidity",
    args: [MOCK_USDC],
  });
  console.log(`   USDC Liquidity: ${formatUnits(liquidity, 6)} USDC`);
  console.log(`   Status: ${Number(liquidity) >= 10000000000 ? '✅ Good' : '⚠️ Low'}\n`);

  // Check vault balance
  console.log("🏛️ ReactiveVault:");
  const vaultBalance = await publicClient.getBalance({
    address: VAULT_ADDRESS as `0x${string}`,
  });
  console.log(`   ETH Balance: ${formatEther(vaultBalance)} ETH`);
  console.log(`   Status: ${Number(vaultBalance) >= 10000000000000000n ? '✅ Good' : '⚠️ Low'}\n`);

  // Check vault position
  const position = await publicClient.readContract({
    address: VAULT_ADDRESS as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "getPosition",
  });

  console.log("📈 Current Position:");
  console.log(`   Collateral: ${formatEther(position[0])} WETH`);
  console.log(`   Debt: ${formatUnits(position[1], 6)} USDC`);
  console.log(`   Loop Count: ${position[2]}/5`);
  console.log(`   Health Factor: ${Number(position[3]) / 1e18}\n`);

  if (position[2] === 5) {
    console.log("✅ All loops completed!");
  } else if (position[2] > 0) {
    console.log(`⏳ Looping in progress... (${position[2]}/5 done)`);
  } else {
    console.log("💤 No active position");
  }

  console.log("\n🔗 Links:");
  console.log(`   Vault: https://sepolia.etherscan.io/address/${VAULT_ADDRESS}`);
  console.log(`   Pool: https://sepolia.etherscan.io/address/${POOL_ADDRESS}`);
  
  if (process.env.SHIELD_BRAIN_ADDRESS) {
    console.log(`   Brain: https://lasna.reactscan.net/address/${process.env.SHIELD_BRAIN_ADDRESS}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

