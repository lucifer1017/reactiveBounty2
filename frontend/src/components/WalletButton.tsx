'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { motion } from 'framer-motion';
import { Wallet, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-500/50">
        <div className="flex items-center gap-3 opacity-50">
          <Wallet className="w-6 h-6" />
          <span>Connect Wallet</span>
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' }}
        whileTap={{ scale: 0.95 }}
        onClick={() => disconnect()}
        className="group relative px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl text-white font-medium overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <div className="relative flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          <span>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <LogOut className="w-4 h-4 opacity-70" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' }}
      whileTap={{ scale: 0.95 }}
      onClick={() => connect({ connector: connectors[0] })}
      className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold text-lg overflow-hidden shadow-lg shadow-purple-500/50"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center gap-3">
        <Wallet className="w-6 h-6" />
        <span>Connect Wallet</span>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 to-pink-600 blur-xl opacity-50" />
    </motion.button>
  );
}

