'use client';

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthFactorBarProps {
  value: number;
}

export function HealthFactorBar({ value }: HealthFactorBarProps) {
  const percentage = Math.min((value / 2) * 100, 100);
  
  const getColor = () => {
    if (value >= 1.5) return 'from-green-500 to-emerald-500';
    if (value >= 1.2) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getIcon = () => {
    if (value >= 1.5) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (value >= 1.2) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <Shield className="w-5 h-5 text-red-400" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-gray-300">Health Factor</span>
        </div>
        <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {value.toFixed(2)}
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${getColor()} relative`}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </motion.div>
        
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 0.5, width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getColor()} blur-md`}
        />
      </div>
    </div>
  );
}

