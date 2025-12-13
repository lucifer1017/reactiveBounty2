/**
 * Contract Addresses and Chain Configuration
 * Reactive Shield - DeFi Leverage Vault
 */

export const CHAIN_ID = 11155111; // Sepolia

export const contracts = {
  // Core Contracts
  vault: '0xE3236658E9eb9B42d21b97C50B58559382a69913' as `0x${string}`,
  pool: '0x31c0921266A1Ac16CC1E49d3dc553af41de46A32' as `0x${string}`,
  
  // Mock Tokens
  weth: '0xF0d30453388f90F3aa6F71788A878d388a42e32b' as `0x${string}`,
  usdc: '0x65a1FC2fe06f89F2AC414b032981Bf3e94a9720D' as `0x${string}`,
  
  // Oracle
  oracle: '0xB8884f31c1a03feD736427F8183345A8613574f9' as `0x${string}`,
  
  // Reactive Network (for display only)
  brain: '0x722B8400EFc57F904a109657a90DED06f3057994' as `0x${string}`,
} as const;

export const EXPLORER_URLS = {
  sepolia: 'https://sepolia.etherscan.io',
  reactive: 'https://lasna.reactscan.net',
} as const;

export const RPC_URLS = {
  sepolia: 'https://rpc.ankr.com/eth_sepolia',
} as const;

