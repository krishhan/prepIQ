'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from 'src/components/Header';
import { mockApi, sessionsApi } from 'src/lib/api';
import { ResumeSession } from 'src/lib/types';
import { ArrowLeft, Play, Clock, Sliders, AlertCircle, Info } from 'lucide-react';

export default function MockSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [session, setSession] = useState<ResumeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Config States
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionMix, setQuestionMix] = useState<string>('balanced');
  const [timeLimit, setTimeLimit] = useState<number | null>(120); // default 2 minutes (120s)

  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        const data = await sessionsApi.detail(sessionId);
        setSession(data);
      } catch (err) {
        setError("Failed to load session details.");
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await mockApi.setup(sessionId, {
        question_count: questionCount,
        question_mix: questionMix,
        time_limit: timeLimit
      });
      // Route to live mock interface
      router.push(`/sessions/${sessionId}/mock/${response.mock.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create mock interview. Make sure the session has generated questions.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Question Bank
        </Link>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 h-96 animate-pulse" />
        ) : !session ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-200">Session Not Found</h3>
            <p className="text-zinc-500 text-sm mt-2 mb-6">This resume prep session does not exist.</p>
            <Link href="/dashboard" className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-sm font-semibold text-white border border-zinc-800 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">Setup Mock Interview</h1>
              <p className="text-zinc-400 text-sm mt-1">Configure your mock interview parameters for {session.job_role}</p>
            </div>

            <div className="glass-panel p-8 rounded-3xl border border-zinc-800">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Info Note */}
                <div className="flex gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-zinc-400 text-xs leading-relaxed">
                  <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-300 block mb-0.5">Simulate Real Pressure</span>
                    Mock interview mode asks questions one by one. You must draft your response and submit or skip. Leaving questions unanswered or timing out will register a timeout. A full scorecard and grading will be generated at completion.
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Question Count Select */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-indigo-400" /> Question Count
                    </label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                      className="block w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm cursor-pointer"
                    >
                      <option value={5}>Short Sprint (5 Questions)</option>
                      <option value={10}>Standard (10 Questions)</option>
                      <option value={15}>Full Simulation (15 Questions)</option>
                    </select>
                  </div>

                  {/* Question Mix Focus Select */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-purple-400" /> Question Mix Focus
                    </label>
                    <select
                      value={questionMix}
                      onChange={(e) => setQuestionMix(e.target.value)}
                      className="block w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm cursor-pointer"
                    >
                      <option value="balanced">Balanced Mix (Technical, Project-based, Behavioral, Role-specific)</option>
                      <option value="technical">Technical Focus (Technical + Project-based only)</option>
                      <option value="behavioral">Behavioral Focus (Behavioral questions only)</option>
                    </select>
                  </div>

                  {/* Timer limit Select */}
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-cyan-400" /> Time Limit Per Question
                    </label>
                    <select
                      value={timeLimit === null ? 'none' : timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                      className="block w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm cursor-pointer"
                    >
                      <option value="none">No time limit (Relaxed Practice)</option>
                      <option value={60}>1 Minute (60 seconds) - Fast Paced</option>
                      <option value={120}>2 Minutes (120 seconds) - Balanced pressure</option>
                      <option value={180}>3 Minutes (180 seconds) - Detailed Answers</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center gap-1.5 py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Enter Mock Interview Room <Play className="w-4 h-4 fill-current" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
