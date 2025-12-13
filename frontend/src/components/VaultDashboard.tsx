'use client';

import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { formatUnits } from 'viem';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { HealthFactorBar } from './HealthFactorBar';
import { LoopProgress } from './LoopProgress';
import { Coins, TrendingUp, Shield, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { contracts, EXPLORER_URLS } from '@/lib/contracts';
import ReactiveVaultABI from '@/lib/abis/ReactiveVault.json';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function VaultDashboard() {
  const { address } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);

  // Read vault position
  const { data: position, refetch } = useReadContract({
    address: contracts.vault,
    abi: ReactiveVaultABI,
    functionName: 'getPosition',
    query: {
      refetchInterval: 5000, // Refresh every 5 seconds
    },
  });

  // Watch for Loop events
  useWatchContractEvent({
    address: contracts.vault,
    abi: ReactiveVaultABI,
    eventName: 'LoopStep',
    onLogs: (logs) => {
      toast.success('🔄 Loop executed!', {
        description: `Loop ${logs[0].args.iteration} completed`,
      });
      refetch();
      setRefreshKey(prev => prev + 1);
    },
  });

  // Watch for Unwind events
  useWatchContractEvent({
    address: contracts.vault,
    abi: ReactiveVaultABI,
    eventName: 'Unwind',
    onLogs: () => {
      toast.success('🛡️ Position unwound!', {
        description: 'Emergency unwind successful',
      });
      refetch();
    },
  });

  if (!address) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20"
      >
        <Shield className="w-20 h-20 mx-auto mb-6 text-purple-400 opacity-50" />
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">Start building leverage with Reactive Shield</p>
      </motion.div>
    );
  }

  const collateral = position ? Number(formatUnits(position[0], 18)) : 0;
  const debt = position ? Number(formatUnits(position[1], 6)) : 0;
  const loopCount = position ? Number(position[2]) : 0;
  const healthFactor = position ? Number(position[3]) / 1e18 : 0;

  return (
    <div className="space-y-8" key={refreshKey}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {/* Collateral Card */}
        <GlassCard delay={0.1}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-3">Collateral</p>
              <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                <AnimatedCounter value={collateral} decimals={4} suffix=" WETH" />
              </div>
            </div>
            <div className="p-4 bg-green-500/20 rounded-xl">
              <Coins className="w-7 h-7 text-green-400" />
            </div>
          </div>
        </GlassCard>

        {/* Debt Card */}
        <GlassCard delay={0.2}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-3">Debt</p>
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                <AnimatedCounter value={debt} decimals={2} suffix=" USDC" />
              </div>
            </div>
            <div className="p-4 bg-orange-500/20 rounded-xl">
              <TrendingUp className="w-7 h-7 text-orange-400" />
            </div>
          </div>
        </GlassCard>

        {/* Loop Progress Card */}
        <GlassCard delay={0.3}>
          <div className="flex flex-col items-center justify-center h-full">
            <LoopProgress current={loopCount} total={5} />
          </div>
        </GlassCard>

        {/* Health Factor Card */}
        <GlassCard delay={0.4}>
          <div className="flex flex-col justify-center h-full">
            <HealthFactorBar value={healthFactor} />
          </div>
        </GlassCard>
      </div>

      {/* Explorer Links */}
      <GlassCard delay={0.5}>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href={`${EXPLORER_URLS.sepolia}/address/${contracts.vault}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
          >
            <span className="text-sm text-gray-300">View Vault</span>
            <ExternalLink className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
          
          <a
            href={`${EXPLORER_URLS.reactive}/address/${contracts.brain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg transition-colors"
          >
            <span className="text-sm text-gray-300">View Brain</span>
            <ExternalLink className="w-4 h-4 text-pink-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </GlassCard>
    </div>
  );
}

