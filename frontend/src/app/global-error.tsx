'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root layout exception:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex items-center justify-center bg-zinc-950 text-zinc-100 antialiased font-sans px-4">
        <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-6">
          <div className="inline-flex p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              Critical System Failure
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A fatal application boundary issue was encountered. Click below to reset the core layout execution.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="w-full inline-flex justify-center items-center gap-2 px-5 py-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
            >
              <RefreshCw className="w-4 h-4 animate-spin-reverse" /> Reload Layout
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
