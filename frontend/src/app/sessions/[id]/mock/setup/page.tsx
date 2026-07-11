'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from 'src/components/Header';
import { mockApi, sessionsApi } from 'src/lib/api';
import { ResumeSession } from 'src/lib/types';
import { ArrowLeft, Play, Clock, Sliders, AlertCircle, Info, Loader2 } from 'lucide-react';

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
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 sm:px-8 space-y-6 animate-fade-in">
        {/* Back Link */}
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Return to Question Bank
        </Link>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="premium-card p-8 h-96 animate-pulse" />
        ) : !session ? (
          <div className="premium-card p-12 text-center max-w-md mx-auto flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-zinc-500 mb-4" strokeWidth={1.5} />
            <h3 className="text-base font-bold text-zinc-200">Session Not Found</h3>
            <p className="text-zinc-500 text-xs mt-2 mb-6 font-medium">This resume prep session does not exist.</p>
            <Link href="/dashboard" className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-white border border-white/[0.06] transition-colors">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Setup Mock Interview</h1>
              <p className="text-zinc-500 text-xs font-medium">Configure your mock interview parameters for {session.job_role}</p>
            </div>

            <div className="premium-card p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Info Note */}
                <div className="flex gap-3 p-4 rounded-xl bg-[#0c0c0e] border border-white/[0.04] text-zinc-400 text-xs leading-relaxed font-medium">
                  <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-200 block uppercase tracking-wider text-[10px]">Simulate Real Pressure</span>
                    <p>Mock interview mode asks questions one by one. You must draft your response and submit or skip. Leaving questions unanswered or timing out will register a timeout. A full scorecard and grading will be generated at completion.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Question Count Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Question Count
                    </label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                      className="focus-ring-premium block w-full py-3 px-4 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      <option value={5}>Short Sprint (5 Questions)</option>
                      <option value={10}>Standard (10 Questions)</option>
                      <option value={15}>Full Simulation (15 Questions)</option>
                    </select>
                  </div>

                  {/* Question Mix Focus Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Question Mix Focus
                    </label>
                    <select
                      value={questionMix}
                      onChange={(e) => setQuestionMix(e.target.value)}
                      className="focus-ring-premium block w-full py-3 px-4 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      <option value="balanced">Balanced Mix (Technical, Project-based, Behavioral, Role-specific)</option>
                      <option value="technical">Technical Focus (Technical + Project-based only)</option>
                      <option value="behavioral">Behavioral Focus (Behavioral questions only)</option>
                    </select>
                  </div>

                  {/* Timer limit Select */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Time Limit Per Question
                    </label>
                    <select
                      value={timeLimit === null ? 'none' : timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                      className="focus-ring-premium block w-full py-3 px-4 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer"
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
                  className="w-full flex justify-center items-center gap-1.5 py-4 px-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:scale-95"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" strokeWidth={1.5} />
                  ) : (
                    <>
                      Enter Mock Interview Room <Play className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
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
