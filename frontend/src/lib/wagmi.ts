/**
 * Wagmi Configuration
 * Web3 setup for Reactive Shield
 */

import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Define project ID for WalletConnect (optional)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
    walletConnect({ projectId }), // WalletConnect support
  ],
  transports: {
    [sepolia.id]: http('https://rpc.ankr.com/eth_sepolia'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

