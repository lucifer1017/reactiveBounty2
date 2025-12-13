'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function GlassCard({ children, className = '', delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{
        scale: 1.015,
        boxShadow: '0 25px 80px rgba(120, 94, 252, 0.25)',
      }}
      className={`relative group overflow-hidden ${className}`}
    >
      {/* Gradient stroke */}
      <div className="absolute inset-0 rounded-2xl p-px bg-gradient-to-br from-purple-500/40 via-cyan-400/30 to-pink-500/40 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Glow ring */}
      <div className="absolute -inset-12 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.15),_transparent_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl" />

      {/* Card body */}
      <div className="relative rounded-2xl bg-[rgba(15,17,28,0.75)] backdrop-blur-2xl border-2 border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-gradient-to-b from-white/8 to-transparent opacity-50" />
        <div className="relative p-10">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

