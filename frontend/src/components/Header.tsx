'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './AuthContext';
import { Terminal, LogOut, LayoutDashboard, User } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
            PrepIQ
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* User Card */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <span className="text-sm font-semibold text-zinc-300 hidden md:inline">
            {user.name}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 rounded-xl transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
