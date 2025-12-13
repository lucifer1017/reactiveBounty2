'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatUnits } from 'viem';
import { GlassCard } from './GlassCard';
import { motion } from 'framer-motion';
import { ArrowDown, Loader2, Sparkles } from 'lucide-react';
import { contracts } from '@/lib/contracts';
import MockWETHABI from '@/lib/abis/MockWETH.json';
import ReactiveVaultABI from '@/lib/abis/ReactiveVault.json';
import { toast } from 'sonner';

export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'mint' | 'approve' | 'deposit'>('idle');

  // Read WETH balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contracts.weth,
    abi: MockWETHABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { writeContract: mint, data: mintHash } = useWriteContract();
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { writeContract: deposit, data: depositHash } = useWriteContract();

  const { isLoading: isMintLoading, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isDepositLoading, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Handle mint success
  useEffect(() => {
    if (isMintSuccess) {
      toast.success('✨ WETH minted!');
      refetchBalance();
      setStep('approve');
    }
  }, [isMintSuccess, refetchBalance]);

  // Handle approve success
  useEffect(() => {
    if (isApproveSuccess) {
      toast.success('✅ Approved!');
      setStep('deposit');
    }
  }, [isApproveSuccess]);

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success('🚀 Deposit successful! Loops starting...', {
        description: 'ShieldBrain will trigger 5 loops automatically',
        duration: 5000,
      });
      setAmount('');
      setStep('idle');
      refetchBalance();
    }
  }, [isDepositSuccess, refetchBalance]);

  const handleMint = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setStep('mint');
    mint({
      address: contracts.weth,
      abi: MockWETHABI,
      functionName: 'mint',
      args: [address, parseEther(amount)],
    });
  };

  const handleApprove = () => {
    approve({
      address: contracts.weth,
      abi: MockWETHABI,
      functionName: 'approve',
      args: [contracts.vault, parseEther(amount)],
    });
  };

  const handleDeposit = () => {
    deposit({
      address: contracts.vault,
      abi: ReactiveVaultABI,
      functionName: 'deposit',
      args: [parseEther(amount)],
    });
  };

  const balanceNum = balance ? Number(formatUnits(balance, 18)) : 0;
  const isLoading = isMintLoading || isApproveLoading || isDepositLoading;

  return (
    <GlassCard delay={0.6}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Deposit & Loop
          </h3>
          <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Your Balance:</span>
          <span className="font-bold text-white">{balanceNum.toFixed(4)} WETH</span>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            disabled={isLoading}
            className="w-full px-6 py-4 bg-gray-800/50 backdrop-blur-sm border-2 border-purple-500/30 focus:border-purple-500 rounded-xl text-white text-2xl font-bold placeholder-gray-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            onClick={() => setAmount(balanceNum.toString())}
            className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-sm text-purple-400 transition-colors"
          >
            MAX
          </button>
        </div>

        {/* Step Indicator */}
        {step !== 'idle' && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>
              {step === 'mint' && 'Minting WETH...'}
              {step === 'approve' && 'Approving vault...'}
              {step === 'deposit' && 'Depositing...'}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {balanceNum < parseFloat(amount || '0') ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMint}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isMintLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Minting...</span>
              </div>
            ) : (
              'Mint Test WETH'
            )}
          </motion.button>
        ) : step === 'approve' ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleApprove}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isApproveLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Approving...</span>
              </div>
            ) : (
              'Approve Vault'
            )}
          </motion.button>
        ) : step === 'deposit' ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDeposit}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isDepositLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Depositing...</span>
              </div>
            ) : (
              'Deposit & Start Loops'
            )}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setStep('approve')}
            disabled={!amount || parseFloat(amount) <= 0 || isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <span>Start Leverage</span>
              <ArrowDown className="w-5 h-5" />
            </div>
          </motion.button>
        )}

        {/* Info */}
        <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <p className="text-sm text-gray-300 text-center">
            🔄 Reactive Shield will automatically execute <span className="text-purple-400 font-bold">5 loops</span> to build leverage
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

