'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from 'src/components/Header';
import { useAuth } from 'src/components/AuthContext';
import { sessionsApi } from 'src/lib/api';
import { ResumeSession } from 'src/lib/types';
import { Plus, BookOpen, Award, FileText, Trash2, ArrowRight, Activity, AlertCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const [sessions, setSessions] = useState<ResumeSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const list = await sessionsApi.list();
      setSessions(list);
      await refreshProfile();
    } catch (err: any) {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this session? This will delete all generated questions, mock attempts, and reports.")) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await sessionsApi.delete(id);
      setSessions(sessions.filter(s => s.id !== id));
      await refreshProfile();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete session. Mocks might be in progress.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 sm:px-8 space-y-12 animate-fade-in">
        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Sessions</p>
              <h2 className="text-3xl font-black text-white tracking-tight">{user?.total_sessions || 0}</h2>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] text-zinc-400 rounded-xl">
              <FileText className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>

          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mock Interviews</p>
              <h2 className="text-3xl font-black text-white tracking-tight">{user?.total_mocks || 0}</h2>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] text-zinc-400 rounded-xl">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>

          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average Score</p>
              <h2 className="text-3xl font-black text-white tracking-tight">{user?.avg_mock_score ? `${user.avg_mock_score}%` : 'N/A'}</h2>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] text-zinc-400 rounded-xl">
              <Activity className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>

          <div className="premium-card p-6 flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Best Score</p>
              <h2 className="text-3xl font-black text-emerald-400 tracking-tight">{user?.best_mock_score ? `${user.best_mock_score}%` : 'N/A'}</h2>
            </div>
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl">
              <Award className="w-5 h-5" strokeWidth={1.5} />
            </div>
          </div>
        </section>

        {/* Sessions Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-white">Resume Sessions</h2>
            <p className="text-zinc-500 text-xs font-medium">Review questions generated from your resumes or take a mock interview</p>
          </div>
          <Link
            href="/sessions/new"
            className="inline-flex items-center gap-1.5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-md shadow-violet-500/10 cursor-pointer hover:-translate-y-0.5 active:scale-95 animate-fade-in"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> New Session
          </Link>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="premium-card p-6 h-56 animate-pulse flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-900 rounded-lg w-2/3" />
                  <div className="h-3 bg-zinc-900 rounded-lg w-1/3" />
                  <div className="h-3 bg-zinc-900 rounded-lg w-1/2" />
                </div>
                <div className="h-9 bg-zinc-900 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="premium-card p-16 text-center max-w-3xl mx-auto flex flex-col items-center justify-center">
            <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-2xl mb-5 text-zinc-500">
              <BookOpen className="w-8 h-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-zinc-200">No Resume Sessions Yet</h3>
            <p className="text-zinc-500 text-xs max-w-sm mt-2 mb-8 leading-relaxed font-medium">
              Upload your PDF resume and select your target role to generate practice questions and simulate interviews.
            </p>
            <Link
              href="/sessions/new"
              className="inline-flex items-center gap-1.5 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.06] rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer hover:-translate-y-0.5"
            >
              Upload Your First Resume
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="premium-card p-6 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-base text-zinc-100 line-clamp-1 tracking-tight">{session.job_role}</h3>
                      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{session.experience_level}</p>
                    </div>

                    {/* Status Badge */}
                    {session.status === 'ready' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        Ready
                      </span>
                    )}
                    {session.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/5 border border-violet-500/10 text-violet-400">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" strokeWidth={1.5} />
                        Analyzing
                      </span>
                    )}
                    {session.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/5 border border-red-500/10 text-red-400">
                        <span className="w-1 h-1 rounded-full bg-red-400" />
                        Failed
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-400 text-xs mt-4 flex items-center gap-2 truncate bg-white/[0.01] border border-white/[0.03] p-2 rounded-xl">
                    <FileText className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" strokeWidth={1.5} />
                    <span className="truncate font-medium">{session.resume_filename}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/[0.04] pt-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">Questions</span>
                      <p className="font-bold text-zinc-200">{session.question_count || 0}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider">Best Score</span>
                      <p className="font-bold text-emerald-400">
                        {session.best_mock_score ? `${session.best_mock_score}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col min-[380px]:flex-row items-stretch min-[380px]:items-center justify-between gap-3 pt-4 border-t border-white/[0.04]">
                  {session.status === 'ready' ? (
                    <div className="flex-1 flex flex-col min-[380px]:flex-row gap-3">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="flex-1 inline-flex justify-center items-center py-2.5 px-3 bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Practice Bank
                      </Link>
                      <Link
                        href={`/sessions/${session.id}/mock/setup`}
                        className="flex-1 inline-flex justify-center items-center gap-1.5 py-2.5 px-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer hover:-translate-y-0.5 active:scale-95"
                      >
                        Start Mock <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </Link>
                    </div>
                  ) : session.status === 'processing' ? (
                    <div className="flex-1 py-2 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 font-medium">
                      <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" strokeWidth={1.5} />
                      Analyzing resume details...
                    </div>
                  ) : (
                    <div className="flex-1 py-2 bg-red-500/5 border border-red-500/10 text-red-400 rounded-xl px-3 text-xs leading-relaxed max-w-full overflow-hidden text-ellipsis font-medium">
                      <span className="font-bold block mb-0.5">Error:</span>
                      {session.error_message || "Generation failed."}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="p-2.5 text-zinc-500 hover:text-red-400 bg-transparent hover:bg-white/[0.02] rounded-xl border border-transparent hover:border-white/[0.04] transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50 self-end min-[380px]:self-auto"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
