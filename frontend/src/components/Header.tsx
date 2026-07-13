'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext';
import { Target, LogOut, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isDashboardActive = pathname === '/dashboard';

  return (
    <header className="glass-navbar sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6 max-w-7xl w-full mx-auto justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="text-[#8B5CF6] group-hover:text-violet-400 transition-colors"
            >
              <Target className="w-7 h-7" strokeWidth={1.5} />
            </motion.div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-sans">
              PrepIQ
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg relative ${
                isDashboardActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Dashboard</span>
              {isDashboardActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-white/[0.03] border border-white/[0.04] rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* User Card */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-950/40 border border-white/[0.04] rounded-xl cursor-default"
          >
            <div className="w-5.5 h-5.5 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="text-xs font-semibold text-zinc-300 hidden md:inline">
              {user.name}
            </span>
          </motion.div>

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-red-400 bg-zinc-950/40 hover:bg-red-500/5 border border-white/[0.04] hover:border-red-500/15 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
