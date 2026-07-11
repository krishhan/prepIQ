'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from 'src/components/AuthContext';
import { Target, Shield, Cpu, MessageSquare, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/[0.03] rounded-full blur-[140px] pointer-events-none z-0 animate-glow-pulse" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-[700px] h-[700px] bg-violet-800/[0.02] rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Header */}
      <header className="glass-navbar sticky top-0 z-50 px-6 py-4 flex items-center justify-between w-full">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Target className="w-7 h-7 text-[#8B5CF6] transition-all duration-200 group-hover:scale-[1.05] group-hover:text-violet-400" strokeWidth={1.5} />
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-sans">
              PrepIQ
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-white px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-md shadow-violet-500/10 cursor-pointer hover:-translate-y-0.5 active:scale-95"
              >
                Dashboard <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-xs uppercase font-bold tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors">
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="text-xs uppercase font-bold tracking-wider text-white px-5 py-2.5 bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto py-20 md:py-28 z-10">


        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[1.05] bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent max-w-4xl">
          Ace Your Next Interview with AI
        </h1>
        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mt-8 leading-relaxed font-medium">
          PrepIQ is an AI-powered interview coach that analyzes your resume and simulates real-time, highly personalized mock interviews. Identify key skills and practice conceptual questions with strict hiring manager evaluations.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-12 w-full sm:w-auto justify-center">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all shadow-lg shadow-violet-500/10 cursor-pointer group hover:-translate-y-0.5 active:scale-95"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all shadow-lg shadow-violet-500/10 cursor-pointer group hover:-translate-y-0.5 active:scale-95"
              >
                Start Practicing Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-zinc-950/40 hover:bg-zinc-900 border border-white/[0.04] hover:border-white/[0.08] rounded-xl text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
              >
                Sign In to Account
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-24 text-left">
          <div className="premium-card p-8">
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-xl w-fit mb-6">
              <Shield className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-zinc-100 mb-3 tracking-tight">Resume Encryption</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium">
              Your resume text is encrypted at rest using AES-based Fernet tokens, guaranteeing maximum privacy and data security.
            </p>
          </div>

          <div className="premium-card p-8">
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-xl w-fit mb-6">
              <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-zinc-100 mb-3 tracking-tight">Real-time Simulation</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium">
              Simulate actual pressure with a real-time mock interview environment, featuring time limits, skips, and strict timeouts.
            </p>
          </div>

          <div className="premium-card p-8">
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-xl w-fit mb-6">
              <Cpu className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-zinc-100 mb-3 tracking-tight">Detailed Roadmaps</h3>
            <p className="text-zinc-400 text-xs leading-relaxed font-medium">
              Receive a comprehensive performance spider-chart, strengths, critical gaps, and priority action lists to improve.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 text-center text-xs text-zinc-650 mt-16 w-full">
        <p className="max-w-7xl mx-auto">© 2026 PrepIQ AI. All rights reserved. Built with Django, Celery, and Next.js.</p>
      </footer>
    </div>
  );
}
