'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface LoopProgressProps {
  current: number;
  total: number;
}

export function LoopProgress({ current, total }: LoopProgressProps) {
  const percentage = (current / total) * 100;

  return (
    <div className="relative w-32 h-32">
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="56"
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth="8"
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx="64"
          cy="64"
          r="56"
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: '0 352' }}
          animate={{ strokeDasharray: `${(352 * percentage) / 100} 352` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Zap className="w-8 h-8 text-purple-400 mb-1 animate-pulse" />
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {current}/{total}
        </div>
        <div className="text-xs text-gray-400">Loops</div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-2xl opacity-20 animate-pulse" />
    </div>
  );
}


