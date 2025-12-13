/**
 * Wagmi Configuration
 * Web3 setup for Reactive Shield
 */

import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, Brave Wallet, etc.
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

