'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from 'src/components/AuthContext';
import { Target, Lock, Mail, User, AlertTriangle } from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, name, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8 bg-[var(--background)] relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/[0.02] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-violet-800/[0.01] rounded-full blur-[100px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl mb-4 text-[#8B5CF6] hover:scale-105 transition-transform duration-200">
            <Target className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white font-sans">
            Create account
          </h1>
          <p className="text-zinc-400 text-xs mt-2 uppercase font-bold tracking-wider">
            Start preparing for your upcoming interviews today
          </p>
        </div>

        <div className="premium-card p-8">
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
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
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-100 placeholder-zinc-600 text-xs font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
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
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-100 placeholder-zinc-600 text-xs font-medium"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
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
                  className="focus-ring-premium block w-full pl-11 pr-4 py-3 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-100 placeholder-zinc-600 text-xs font-medium"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-zinc-500 font-medium">Already have an account? </span>
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
