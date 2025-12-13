'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEther, formatUnits, type Hash } from 'viem';
import { GlassCard } from './GlassCard';
import { motion } from 'framer-motion';
import { ArrowDown, Loader2, Sparkles } from 'lucide-react';
import { contracts } from '@/lib/contracts';
import MockWETHABI from '@/lib/abis/MockWETH.json';
import ReactiveVaultABI from '@/lib/abis/ReactiveVault.json';
import { toast } from 'sonner';

export function DepositForm() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'mint' | 'approve' | 'deposit'>('idle');
  const [mintDone, setMintDone] = useState(false);
  const [approveDone, setApproveDone] = useState(false);
  const [depositDone, setDepositDone] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<Hash | undefined>(undefined);
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>(undefined);
  const [depositTxHash, setDepositTxHash] = useState<Hash | undefined>(undefined);

  // Read WETH balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contracts.weth,
    abi: MockWETHABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContractAsync } = useWriteContract();

  const requireClient = () => {
    if (!address) throw new Error('Wallet not connected');
    if (!publicClient) throw new Error('RPC not ready');
  };

  const waitReceipt = async (hash: Hash) => {
    // This polls via the configured wagmi transport (with fallbacks)
    return await publicClient!.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 120_000,
    });
  };

  const handleMint = async () => {
    try {
      requireClient();
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      setStep('mint');
      setMintDone(false);
      setMintTxHash(undefined);

      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: contracts.weth,
        abi: MockWETHABI,
        functionName: 'mint',
        args: [address!, parseEther(amount)],
      });
      setMintTxHash(hash);

      const receipt = await waitReceipt(hash);
      if (receipt.status === 'reverted') throw new Error('Reverted');

      setMintDone(true);
      toast.success('✨ WETH minted!');
      refetchBalance();
      setStep('approve');
    } catch (e) {
      toast.error('Mint failed or timed out. Please retry.');
      setStep('idle');
    }
  };

  const handleApprove = async () => {
    try {
      requireClient();
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Enter an amount first');
        return;
      }
      setStep('approve');
      setApproveDone(false);
      setApproveTxHash(undefined);

      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: contracts.weth,
        abi: MockWETHABI,
        functionName: 'approve',
        args: [contracts.vault, parseEther(amount)],
      });
      setApproveTxHash(hash);

      const receipt = await waitReceipt(hash);
      if (receipt.status === 'reverted') throw new Error('Reverted');

      setApproveDone(true);
      toast.success('✅ Approved!');
      setStep('deposit');
    } catch {
      toast.error('Approval failed or timed out. Please retry.');
      setStep('idle');
    }
  };

  const handleDeposit = async () => {
    try {
      requireClient();
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Enter an amount first');
        return;
      }
      setStep('deposit');
      setDepositDone(false);
      setDepositTxHash(undefined);

      const hash = await writeContractAsync({
        chainId: sepolia.id,
        address: contracts.vault,
        abi: ReactiveVaultABI,
        functionName: 'deposit',
        args: [parseEther(amount)],
      });
      setDepositTxHash(hash);

      const receipt = await waitReceipt(hash);
      if (receipt.status === 'reverted') throw new Error('Reverted');

      setDepositDone(true);
      toast.success('🚀 Deposit successful! Loops starting...', {
        description: 'ShieldBrain will trigger 5 loops automatically',
        duration: 5000,
      });
      setAmount('');
      setStep('idle');
      refetchBalance();
    } catch {
      toast.error('Deposit failed or timed out. Please retry.');
      setStep('idle');
    }
  };

  const balanceNum = balance ? Number(formatUnits(balance, 18)) : 0;
  const isMintPending = step === 'mint' && !mintDone && !!mintTxHash;
  const isApprovePending = step === 'approve' && !approveDone && !!approveTxHash;
  const isDepositPending = step === 'deposit' && !depositDone && !!depositTxHash;
  const isLoading = isMintPending || isApprovePending || isDepositPending;

  return (
    <div className="w-full">
      <GlassCard delay={0.6}>
        <div className="space-y-8 p-2">
          {/* Header with better visibility */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-purple-500/30">
            <h3 className="text-3xl font-bold text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]">
              Deposit & Loop
            </h3>
            <Sparkles className="w-7 h-7 text-purple-400 animate-pulse drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
          </div>

          {/* Balance with better styling */}
          <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-2xl border-2 border-purple-500/30 shadow-lg">
            <span className="text-base font-semibold text-purple-200">Your Balance:</span>
            <span className="font-bold text-xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {balanceNum.toFixed(4)} <span className="text-purple-300">WETH</span>
            </span>
          </div>

          {/* Modern Input with proper spacing */}
          <div className="relative group px-2 py-4">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-lg opacity-40 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-2 border-2 border-purple-500/30">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={isLoading}
                className="w-full px-8 py-8 bg-transparent border-0 text-white text-5xl font-bold placeholder-gray-600 outline-none transition-all disabled:opacity-50"
              />
              <button
                onClick={() => setAmount(balanceNum.toString())}
                disabled={isLoading}
                className="absolute right-6 top-1/2 -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-400 hover:via-purple-500 hover:to-pink-400 rounded-xl text-base font-bold text-white transition-all shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                MAX
              </button>
            </div>
          </div>

        {/* Step Indicator */}
        {step !== 'idle' && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>
              {step === 'mint' && 'Minting WETH...'}
              {step === 'approve' && 'Approving vault...'}
              {step === 'deposit' && 'Depositing...'}
            </span>
          </div>
        )}

        {/* Action Buttons - Ultra Modern Style */}
        <div className="px-2 py-4">
          {balanceNum < parseFloat(amount || '0') ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleMint}
              disabled={isLoading}
              className="relative w-full py-6 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:via-purple-400 hover:to-pink-500 rounded-2xl text-white font-bold text-xl shadow-[0_10px_40px_rgba(168,85,247,0.5)] hover:shadow-[0_20px_60px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden border-2 border-purple-400/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="relative">
                {isMintPending ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Minting...</span>
                  </div>
                ) : (
                  'Mint Test WETH'
                )}
              </div>
            </motion.button>
          ) : step === 'approve' ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleApprove}
              disabled={isLoading}
              className="relative w-full py-6 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 hover:from-blue-500 hover:via-cyan-400 hover:to-purple-500 rounded-2xl text-white font-bold text-xl shadow-[0_10px_40px_rgba(59,130,246,0.5)] hover:shadow-[0_20px_60px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden border-2 border-blue-400/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="relative">
                {isApprovePending ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Approving...</span>
                  </div>
                ) : (
                  'Approve Vault'
                )}
              </div>
            </motion.button>
          ) : step === 'deposit' ? (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDeposit}
              disabled={isLoading}
              className="relative w-full py-6 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 hover:from-green-500 hover:via-emerald-400 hover:to-teal-500 rounded-2xl text-white font-bold text-xl shadow-[0_10px_40px_rgba(16,185,129,0.5)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden border-2 border-green-400/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="relative">
                {isDepositPending ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Depositing...</span>
                  </div>
                ) : (
                  'Deposit & Start Loops'
                )}
              </div>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('approve')}
              disabled={!amount || parseFloat(amount) <= 0 || isLoading}
              className="relative group w-full py-6 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-500 hover:via-purple-400 hover:to-pink-500 rounded-2xl text-white font-bold text-xl shadow-[0_10px_40px_rgba(168,85,247,0.5)] hover:shadow-[0_20px_60px_rgba(168,85,247,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden border-2 border-purple-400/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center gap-3">
                <span>Start Leverage</span>
                <ArrowDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
              </div>
            </motion.button>
          )}
        </div>

        {/* Info */}
        <div className="relative mx-2 mt-4 p-6 bg-gradient-to-r from-purple-500/15 to-blue-500/15 rounded-2xl border-2 border-purple-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl" />
          <p className="relative text-sm md:text-base font-semibold text-white text-center leading-relaxed md:leading-loose break-words">
            <span className="inline-block mr-2 text-lg md:text-xl">🔄</span>
            Reactive Shield will automatically execute <span className="text-purple-200 font-bold px-2.5 py-1 bg-purple-500/25 rounded-lg border border-purple-400/30">5 loops</span> to build leverage
          </p>
        </div>
        </div>
      </GlassCard>
    </div>
  );
}

