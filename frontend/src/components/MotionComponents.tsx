'use client';

import React, { useEffect, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

// Reusable Framer Motion Variants
export const pageTransitionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const }
  }
};

export const staggerContainerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

export const staggerItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
  }
};

// 1. Page Transition Wrapper
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 flex flex-col w-full"
    >
      {children}
    </motion.div>
  );
};

// 2. Stagger Layout Container
export const MotionContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const MotionItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 3. Animated Statistics Counter (Counts from 0 to target value)
export const AnimatedCounter: React.FC<{ value: number; suffix?: string; duration?: number }> = ({ value, suffix = '', duration = 1 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setDisplayValue(Math.floor(progress * value));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span className="tabular-nums">{displayValue}{suffix}</span>;
};

// 4. Premium Animated Hover Card (Glassmorphic)
interface AnimatedCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = '', glowColor = 'rgba(0, 245, 212, 0.04)', ...props }) => {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`premium-card p-6 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl relative overflow-hidden shadow-xl group ${className}`}
      {...props}
    >
      {/* Background glow vignette */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 60%)`
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// 5. Glowing Button with interactive states
interface GlowButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const GlowButton: React.FC<GlowButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = "relative inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all overflow-hidden cursor-pointer";
  
  let variantClasses = "";
  if (variant === 'primary') {
    variantClasses = "bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-500/10";
  } else if (variant === 'secondary') {
    variantClasses = "bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 text-zinc-300 hover:text-white";
  } else if (variant === 'danger') {
    variantClasses = "bg-red-950/20 border border-red-500/10 hover:bg-red-500/10 text-red-400 hover:border-red-500/20";
  }

  return (
    <motion.button
      whileHover={{ y: -1, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

// 6. Smooth Progress Bar
export const AnimatedProgressBar: React.FC<{ progress: number; className?: string }> = ({ progress, className = '' }) => {
  return (
    <div className={`w-full bg-[#0c0c0e] h-1.5 rounded-full overflow-hidden border border-white/[0.04] ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
        className="bg-violet-600 h-full rounded-full"
      />
    </div>
  );
};

// 7. Shimmer Skeleton Card Loaders
export const SkeletonLoader: React.FC<{ rows?: number; height?: string }> = ({ rows = 3, height = 'h-56' }) => {
  return (
    <div className={`premium-card p-6 ${height} flex flex-col justify-between overflow-hidden relative`}>
      <div className="space-y-4">
        <div className="h-4 bg-zinc-900 rounded-lg w-2/3 animate-shimmer" />
        <div className="space-y-2">
          {Array.from({ length: rows - 1 }).map((_, idx) => (
            <div key={idx} className="h-2.5 bg-zinc-900 rounded-lg w-full animate-shimmer" />
          ))}
          <div className="h-2.5 bg-zinc-900 rounded-lg w-4/5 animate-shimmer" />
        </div>
      </div>
      <div className="h-9 bg-zinc-900 rounded-xl w-full animate-shimmer" />
    </div>
  );
};

// 8. Aurora Floating Background Lights
export const FloatingBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="aurora-light aurora-light-purple top-[-10%] right-[-10%]" />
      <div className="aurora-light aurora-light-teal bottom-[20%] left-[-15%]" />
      <div className="aurora-light aurora-light-cyan top-[40%] right-[10%]" />
    </div>
  );
};
