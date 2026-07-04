'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from 'src/components/Header';
import { useAuth } from 'src/components/AuthContext';
import { sessionsApi } from 'src/lib/api';
import { ResumeSession } from 'src/lib/types';
import { Plus, BookOpen, Award, FileText, Trash2, ArrowRight, Activity, AlertCircle } from 'lucide-react';

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
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="glass-panel p-6 rounded-3xl relative border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Sessions</p>
              <h2 className="text-3xl font-extrabold text-zinc-100 mt-1">{user?.total_sessions || 0}</h2>
            </div>
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl relative border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Mock Interviews</p>
              <h2 className="text-3xl font-extrabold text-zinc-100 mt-1">{user?.total_mocks || 0}</h2>
            </div>
            <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl relative border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Average Score</p>
              <h2 className="text-3xl font-extrabold text-zinc-100 mt-1">{user?.avg_mock_score ? `${user.avg_mock_score}%` : 'N/A'}</h2>
            </div>
            <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl relative border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Best Score</p>
              <h2 className="text-3xl font-extrabold text-emerald-400 mt-1">{user?.best_mock_score ? `${user.best_mock_score}%` : 'N/A'}</h2>
            </div>
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Sessions Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Resume Sessions</h2>
            <p className="text-zinc-400 text-sm mt-1">Review questions generated from your resumes or take a mock interview</p>
          </div>
          <Link
            href="/sessions/new"
            className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md cursor-pointer hover:shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" /> New Session
          </Link>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel p-6 rounded-3xl border border-zinc-800 h-56 animate-pulse flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="h-5 bg-zinc-800 rounded-lg w-2/3" />
                  <div className="h-4 bg-zinc-800 rounded-lg w-1/3" />
                  <div className="h-4 bg-zinc-800 rounded-lg w-1/2" />
                </div>
                <div className="h-10 bg-zinc-800 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center border border-zinc-800">
            <BookOpen className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-200">No Resume Sessions Yet</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mt-2 mb-6">
              Upload your PDF resume and select your target role to generate practice questions and simulate interviews.
            </p>
            <Link
              href="/sessions/new"
              className="inline-flex items-center gap-1.5 px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-2xl text-sm font-semibold text-white transition-all cursor-pointer"
            >
              Upload Your First Resume
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="glass-panel p-6 rounded-3xl border border-zinc-800 flex flex-col justify-between relative transition-all duration-300 hover:border-zinc-700 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-zinc-100 line-clamp-1">{session.job_role}</h3>
                      <p className="text-zinc-500 text-xs font-semibold mt-0.5">{session.experience_level}</p>
                    </div>

                    {/* Status Badge */}
                    {session.status === 'ready' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        Ready
                      </span>
                    )}
                    {session.status === 'processing' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                        Analyzing
                      </span>
                    )}
                    {session.status === 'failed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                        Failed
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-400 text-xs mt-3 flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    {session.resume_filename}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-6 border-t border-zinc-900 pt-4 text-sm text-zinc-400">
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Questions</span>
                      <p className="font-semibold mt-0.5 text-zinc-200">{session.question_count || 0}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Best Score</span>
                      <p className="font-semibold mt-0.5 text-emerald-400">
                        {session.best_mock_score ? `${session.best_mock_score}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-zinc-900">
                  {session.status === 'ready' ? (
                    <>
                      <Link
                        href={`/sessions/${session.id}`}
                        className="flex-1 inline-flex justify-center items-center py-2 px-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Practice Bank
                      </Link>
                      <Link
                        href={`/sessions/${session.id}/mock/setup`}
                        className="flex-1 inline-flex justify-center items-center gap-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        Start Mock <ArrowRight className="w-3 h-3" />
                      </Link>
                    </>
                  ) : session.status === 'processing' ? (
                    <div className="flex-1 py-2 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      Analyzing resume details...
                    </div>
                  ) : (
                    <div className="flex-1 py-1 bg-red-500/5 border border-red-500/10 text-red-400 rounded-xl p-3 text-xs leading-relaxed max-w-full overflow-hidden text-ellipsis">
                      <span className="font-bold block mb-0.5">Error:</span>
                      {session.error_message || "Generation failed."}
                    </div>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="p-2 text-zinc-500 hover:text-red-400 bg-transparent hover:bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-800 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
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
