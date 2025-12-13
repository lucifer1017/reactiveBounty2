'use client';

import { useAccount, useReadContract, useWatchContractEvent, useWriteContract, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from './AnimatedCounter';
import { HealthFactorBar } from './HealthFactorBar';
import { LoopProgress } from './LoopProgress';
import { Coins, TrendingUp, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { contracts, EXPLORER_URLS, REACTIVE_SCAN_URLS } from '@/lib/contracts';
import ReactiveVaultABI from '@/lib/abis/ReactiveVault.json';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { sepolia } from 'wagmi/chains';

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ORACLE_ABI = [
  {
    inputs: [{ name: 'newPrice', type: 'uint256' }],
    name: 'setPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function VaultDashboard() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { writeContractAsync } = useWriteContract();
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [oracleTxPending, setOracleTxPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read vault position
  const { data: position, refetch } = useReadContract({
    address: contracts.vault,
    abi: ReactiveVaultABI,
    functionName: 'getPosition',
    query: {
      refetchInterval: 5000, // Refresh every 5 seconds
    },
  });

  const { data: oraclePrice, refetch: refetchOraclePrice } = useReadContract({
    address: contracts.oracle,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    query: { refetchInterval: 10_000 },
  });

  // Show where assets end up after unwind (vault holds withdrawn collateral)
  const { data: vaultWethBal, refetch: refetchVaultWethBal } = useReadContract({
    address: contracts.weth,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [contracts.vault],
    query: { refetchInterval: 10_000 },
  });

  const { data: vaultUsdcBal, refetch: refetchVaultUsdcBal } = useReadContract({
    address: contracts.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [contracts.vault],
    query: { refetchInterval: 10_000 },
  });

  // Watch for Loop events
  useWatchContractEvent({
    address: contracts.vault,
    abi: ReactiveVaultABI,
    eventName: 'LoopStep',
    enabled: mounted,
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
    enabled: mounted,
    onLogs: (logs) => {
      const args = logs?.[0]?.args as
        | { repaidDebt?: bigint; withdrawnCollateral?: bigint }
        | undefined;
      const repaid = args?.repaidDebt ? Number(args.repaidDebt) / 1e6 : undefined;
      const withdrawn = args?.withdrawnCollateral ? Number(args.withdrawnCollateral) / 1e18 : undefined;

      toast.success('🛡️ Position unwound!', {
        description:
          repaid != null && withdrawn != null
            ? `Repaid ~${repaid.toFixed(2)} USDC • Withdrew ~${withdrawn.toFixed(4)} WETH (to vault)`
            : 'Emergency unwind successful (assets moved back to vault)',
      });
      refetch();
      refetchOraclePrice();
      refetchVaultWethBal();
      refetchVaultUsdcBal();
    },
  });

  const setPriceUsd = async (usd: bigint) => {
    if (!address) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!publicClient) {
      toast.error('RPC not ready yet, retry in a moment');
      return;
    }
    setOracleTxPending(true);
    try {
      // oracle uses 36 decimals (see contracts/contracts/mocks/MockOracle.sol)
      const newPrice = usd * 10n ** 36n;
      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: contracts.oracle,
        abi: ORACLE_ABI,
        functionName: 'setPrice',
        args: [newPrice],
      });

      await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
      toast.success('📉 Oracle price updated', { description: `Set WETH to $${usd.toString()}` });
      refetchOraclePrice();

      // Unwind is not immediate: ShieldBrain on Reactive Network must observe PriceUpdated and send callback.
      toast.message('Waiting for Reactive unwind…', {
        description: 'If price < $2000, ShieldBrain should trigger unwind shortly.',
        duration: 6000,
      });
    } catch {
      toast.error('Failed to update oracle price');
    } finally {
      setOracleTxPending(false);
    }
  };

  if (!mounted) {
    return (
      <GlassCard delay={0.05}>
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin text-purple-300" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      </GlassCard>
    );
  }

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
  const oracleUsd = oraclePrice ? Number(oraclePrice / 10n ** 36n) : undefined;
  const vaultWeth = vaultWethBal ? Number(formatUnits(vaultWethBal, 18)) : 0;
  const vaultUsdc = vaultUsdcBal ? Number(formatUnits(vaultUsdcBal, 6)) : 0;

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

      {/* Demo controls */}
      <GlassCard delay={0.45}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm text-gray-400">Demo Controls (MockOracle)</p>
              <p className="text-lg font-semibold text-white">
                Oracle Price: {oracleUsd ?? '…'} <span className="text-gray-400">USD</span>
              </p>
              <p className="text-xs text-gray-500">
                Unwind triggers when price &lt; $2000 (ShieldBrain CRASH_PRICE_THRESHOLD).
              </p>
              <p className="text-xs text-gray-500 mt-2">
                After unwind, collateral is withdrawn <span className="text-gray-300">to the vault contract</span> (not automatically to your wallet).
              </p>
            </div>
            <a
              href={`${EXPLORER_URLS.sepolia}/address/${contracts.oracle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/40 hover:bg-gray-800/60 rounded-lg transition-colors w-fit"
            >
              <span className="text-sm text-gray-300">View Oracle</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setPriceUsd(3000n)}
              disabled={oracleTxPending}
              className="px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-white/10 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset ($3000)
            </button>
            <button
              onClick={() => setPriceUsd(1900n)}
              disabled={oracleTxPending}
              className="px-4 py-3 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-400/20 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Stress ($1900)
            </button>
            <button
              onClick={() => setPriceUsd(1000n)}
              disabled={oracleTxPending}
              className="px-4 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Crash ($1000)
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Current: loops {loopCount}/5 • debt {debt.toFixed(2)} USDC • health factor {healthFactor.toFixed(2)}
          </div>

          <div className="text-xs text-gray-500">
            Vault balances: {vaultWeth.toFixed(4)} WETH • {vaultUsdc.toFixed(2)} USDC
          </div>
        </div>
      </GlassCard>

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
            href={REACTIVE_SCAN_URLS.brainContract ?? `${EXPLORER_URLS.reactive}/address/${contracts.brain}`}
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

