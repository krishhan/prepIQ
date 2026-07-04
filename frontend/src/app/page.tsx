'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from 'src/components/AuthContext';
import { Terminal, Shield, Cpu, MessageSquare, ArrowRight, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-indigo-400" />
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
            PrepIQ
          </span>
        </div>
        <nav className="flex items-center gap-6">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-semibold text-white px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md cursor-pointer"
            >
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold text-white px-5 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto py-16 md:py-24 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-6 animate-pulse">
          <Cpu className="w-4 h-4" />
          <span>Now Powered by meta-llama-3.1</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Ace Your Next Interview with AI
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mt-6 leading-relaxed">
          PrepIQ is an AI-powered interview coach that analyzes your resume and simulates real-time, highly personalized mock interviews. Identify key skills and practice conceptual questions with strict hiring manager evaluations.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-base font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/15 cursor-pointer group"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-base font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/15 cursor-pointer group"
              >
                Start Practicing Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-base font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Sign In to Account
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-20 text-left">
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/80 transition-all duration-300">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl w-fit mb-5">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Resume Encryption</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your resume text is encrypted at rest using AES-based Fernet tokens, guaranteeing maximum privacy and data security.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/80 transition-all duration-300">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl w-fit mb-5">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Real-time Simulation</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Simulate actual pressure with a real-time mock interview environment, featuring time limits, skips, and strict timeouts.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 hover:border-zinc-700/80 transition-all duration-300">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl w-fit mb-5">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Detailed Roadmaps</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Receive a comprehensive performance spider-chart, strengths, critical gaps, and priority action lists to improve.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 px-6 text-center text-sm text-zinc-600 mt-12 max-w-7xl w-full mx-auto z-10">
        <p>© 2026 PrepIQ AI. All rights reserved. Built with Django, Celery, and Next.js.</p>
      </footer>
    </div>
  );
}
