'use client';

import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { WalletButton } from '@/components/WalletButton';
import { VaultDashboard } from '@/components/VaultDashboard';
import { DepositForm } from '@/components/DepositForm';
import { Shield, Zap, Github } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-6 md:px-8 lg:px-12 py-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-16 pb-6"
        >
          <div className="flex items-center gap-4">
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-purple-500/30 via-blue-500/20 to-cyan-400/20 border border-white/10 shadow-[0_15px_60px_rgba(88,28,135,0.25)]">
              <Shield className="w-10 h-10 text-purple-200" />
              <div className="absolute -inset-3 bg-[radial-gradient(circle_at_center,_rgba(139,92,246,0.25),_transparent_60%)] blur-3xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                Reactive Shield
              </h1>
              <p className="text-sm text-gray-400">Autonomous DeFi leverage powered by Reactive Network</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/yourusername/reactive-shield"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/50 rounded-xl transition-colors"
            >
              <Github className="w-5 h-5 text-gray-400" />
            </a>
            <WalletButton />
          </div>
        </motion.header>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full mb-8 shadow-lg shadow-purple-500/20">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-200">Powered by Reactive Network</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-cyan-100 bg-clip-text text-transparent">
            Next‑gen Autonomous Leverage
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Deposit WETH once and let Reactive Shield auto‑loop <span className="text-purple-300 font-semibold">5x</span>, manage health factor, and unwind on crashes — all without bots or manual clicks.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 max-w-7xl mx-auto px-4">
          {/* Dashboard - Takes 2 columns */}
          <div className="lg:col-span-2 w-full">
            <VaultDashboard />
          </div>

          {/* Deposit Form - Takes 1 column */}
          <div className="w-full max-w-xl lg:max-w-none mx-auto">
            <DepositForm />
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-20 text-center text-gray-500 text-sm"
        >
          <p>
            Built with 💜 for Reactive Network Hackathon
          </p>
          <p className="mt-2">
            <span className="text-purple-400">⚠️ Testnet Only</span> • Sepolia Network
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
