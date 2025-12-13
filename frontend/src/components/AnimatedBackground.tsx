'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// Deterministic orb configs (no randomness => no hydration issues)
const orbConfigs = [
  { size: 360, color: 'rgba(99, 102, 241, 0.18)', x: [10, 60, 30], y: [20, 70, 40], duration: 32 },
  { size: 420, color: 'rgba(168, 85, 247, 0.16)', x: [80, 40, 70], y: [35, 15, 75], duration: 36 },
  { size: 300, color: 'rgba(6, 182, 212, 0.16)', x: [45, 90, 20], y: [65, 35, 80], duration: 30 },
  { size: 340, color: 'rgba(236, 72, 153, 0.16)', x: [75, 25, 80], y: [25, 85, 50], duration: 34 },
  { size: 320, color: 'rgba(56, 189, 248, 0.14)', x: [55, 15, 95], y: [85, 45, 65], duration: 33 },
];

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b12] via-[#0f1628] to-[#0b0b12]" />
      
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-50"
        animate={{
          background: [
            'radial-gradient(circle at 20% 40%, rgba(99,102,241,0.28) 0%, transparent 40%)',
            'radial-gradient(circle at 80% 30%, rgba(236,72,153,0.26) 0%, transparent 42%)',
            'radial-gradient(circle at 50% 80%, rgba(6,182,212,0.24) 0%, transparent 38%)',
            'radial-gradient(circle at 20% 40%, rgba(99,102,241,0.28) 0%, transparent 40%)',
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating orbs */}
      {orbConfigs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            background: orb.color,
          }}
          animate={{
            x: orb.x.map(val => `${val}vw`),
            y: orb.y.map(val => `${val}vh`),
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />
    </div>
  );
}

