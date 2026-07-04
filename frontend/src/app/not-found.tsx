'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-16 text-center relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-zinc-800 space-y-6 relative z-10 animate-scale">
        <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white">404</h1>
          <h2 className="text-lg font-bold text-zinc-200">Page Not Found</h2>
          <p className="text-zinc-550 text-sm leading-relaxed">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
          >
            <Home className="w-4 h-4" /> Go Dashboard
          </Link>
          
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.history.back();
            }}
            className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
