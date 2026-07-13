'use client';

import React, { useState, MouseEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from 'src/components/AuthContext';
import { Target, Lock, Mail, User, AlertTriangle, Loader2 } from 'lucide-react';
import { FloatingBackground, GlowButton } from 'src/components/MotionComponents';

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  // Parallax Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget.getBoundingClientRect();
    
    // Calculate tilt
    const x = e.clientX - card.left - card.width / 2;
    const y = e.clientY - card.top - card.height / 2;
    setTilt({ x: x * 0.03, y: y * 0.03 });

    // Calculate relative cursor position for radial glow
    const glowX = ((e.clientX - card.left) / card.width) * 100;
    const glowY = ((e.clientY - card.top) / card.height) * 100;
    setGlowPos({ x: glowX, y: glowY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlowPos({ x: 50, y: 50 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      triggerShake();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, name, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || "Registration failed. Please try again.");
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const triggerShake = () => {
    setShakeTrigger(true);
    setTimeout(() => setShakeTrigger(false), 500);
  };

  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-[var(--background)] relative overflow-hidden min-h-screen">
      {/* Background lights */}
      <FloatingBackground />

      <div className="w-full max-w-md z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
          className="text-center mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.08, rotate: 5 }}
            className="inline-flex items-center justify-center p-3.5 bg-violet-500/5 border border-violet-500/10 rounded-2xl mb-4 text-[#8B5CF6] shadow-inner cursor-pointer"
          >
            <Target className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-3.5xl font-black tracking-tight text-white font-sans bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Create account
          </h1>
          <p className="text-zinc-500 text-[10px] mt-2.5 uppercase font-bold tracking-widest">
            Start preparing for your upcoming interviews today
          </p>
        </motion.div>

        {/* Card wrapper */}
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `perspective(1000px) rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg)`,
            transition: submitting ? 'none' : 'transform 0.15s ease-out'
          }}
          animate={shakeTrigger ? { x: [-6, 6, -6, 6, -3, 3, 0] } : {}}
          transition={shakeTrigger ? { duration: 0.4 } : {}}
          className="premium-card p-8 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl relative overflow-hidden shadow-2xl"
        >
          {/* Radial Hover glow */}
          <div 
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle 250px at ${glowPos.x}% ${glowPos.y}%, rgba(0, 245, 212, 0.05) 0%, transparent 80%)`
            }}
          />

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.form 
            variants={formVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            <motion.div variants={itemVariants}>
              <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3.5 bg-zinc-950/40 border border-white/[0.06] hover:border-white/[0.1] rounded-xl text-zinc-100 placeholder-zinc-700 text-xs font-medium focus:bg-zinc-950"
                  placeholder="John Doe"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3.5 bg-zinc-950/40 border border-white/[0.06] hover:border-white/[0.1] rounded-xl text-zinc-100 placeholder-zinc-700 text-xs font-medium focus:bg-zinc-950"
                  placeholder="name@company.com"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3.5 bg-zinc-950/40 border border-white/[0.06] hover:border-white/[0.1] rounded-xl text-zinc-100 placeholder-zinc-700 text-xs font-medium focus:bg-zinc-950"
                  placeholder="At least 6 characters"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <GlowButton
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-xs tracking-wider"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" strokeWidth={1.5} />
                ) : (
                  "Create Account"
                )}
              </GlowButton>
            </motion.div>
          </motion.form>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-xs"
          >
            <span className="text-zinc-500 font-medium">Already have an account? </span>
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Log in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
