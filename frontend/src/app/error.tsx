'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to logging services
    console.error("Unhandled client-side boundary exception:", error);
  }, [error]);

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-16 text-center">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border border-zinc-800 space-y-6">
        <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-3xl">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-zinc-100">
            Something went wrong
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            An unexpected error occurred during execution. Please try refreshing the screen or contact support if the issue persists.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          
          <Link
            href="/dashboard"
            className="flex-1 inline-flex justify-center items-center gap-2 px-5 py-3 text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-2xl transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" /> Go Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
