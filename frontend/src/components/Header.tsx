'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { Target, LogOut, LayoutDashboard, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="glass-navbar sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <Target className="w-7 h-7 text-[#8B5CF6] transition-all duration-200 group-hover:scale-[1.05] group-hover:text-violet-400" strokeWidth={1.5} />
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-sans">
            PrepIQ
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs uppercase font-bold tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* User Card */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/40 border border-white/[0.04] rounded-xl">
          <div className="w-5.5 h-5.5 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-semibold text-zinc-300 hidden md:inline">
            {user.name}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-950/40 hover:bg-red-500/10 border border-white/[0.04] hover:border-red-500/20 rounded-xl transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
