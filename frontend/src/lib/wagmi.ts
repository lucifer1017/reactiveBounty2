/**
 * Wagmi Configuration
 * Web3 setup for Reactive Shield
 */

import { http, createConfig, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, Brave Wallet, etc.
  ],
  transports: {
    // Use fallbacks so receipt polling doesn't hang if a single RPC is flaky/rate-limited.
    [sepolia.id]: fallback([
      http('https://rpc.ankr.com/eth_sepolia'),
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://sepolia.drpc.org'),
    ]),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

