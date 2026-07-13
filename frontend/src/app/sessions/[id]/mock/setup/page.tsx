'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from 'src/components/Header';
import { mockApi, sessionsApi } from 'src/lib/api';
import { ResumeSession } from 'src/lib/types';
import { ArrowLeft, Play, Clock, Sliders, AlertCircle, Info, Loader2 } from 'lucide-react';
import { GlowButton, FloatingBackground, MotionContainer, MotionItem } from 'src/components/MotionComponents';

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)] relative overflow-hidden">
      <FloatingBackground />
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 sm:px-8 space-y-6 z-10">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Return to Question Bank
          </Link>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="premium-card p-8 h-96 animate-pulse bg-zinc-900/30" />
        ) : !session ? (
          <div className="premium-card p-12 text-center max-w-md mx-auto flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-zinc-500 mb-4" strokeWidth={1.5} />
            <h3 className="text-base font-bold text-zinc-200">Session Not Found</h3>
            <p className="text-zinc-500 text-xs mt-2 mb-6 font-medium">This resume prep session does not exist.</p>
            <Link href="/dashboard">
              <GlowButton variant="secondary" className="text-xs">
                Return to Dashboard
              </GlowButton>
            </Link>
          </div>
        ) : (
          <MotionContainer 
            className="space-y-6"
          >
            <MotionItem className="space-y-1.5">
              <h1 className="text-2.5xl sm:text-3.5xl font-black tracking-tight text-white">Setup Mock Interview</h1>
              <p className="text-zinc-500 text-xs font-medium">Configure your mock interview parameters for {session.job_role}</p>
            </MotionItem>

            <MotionItem>
              <div className="premium-card p-8 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-white/[0.04] shadow-2xl rounded-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Info Note */}
                  <div className="flex gap-3.5 p-4.5 rounded-2xl bg-zinc-950 border border-white/[0.04] text-zinc-400 text-xs leading-relaxed font-medium">
                    <Info className="w-4 h-4 text-violet-450 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-200 block uppercase tracking-wider text-[9px]">Simulate Real Pressure</span>
                      <p>Mock interview mode asks questions one by one. You must draft your response and submit or skip. Leaving questions unanswered or timing out will register a timeout. A full scorecard and grading will be generated at completion.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Question Count Select */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Question Count
                      </label>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                        className="focus-ring-premium block w-full py-3 px-4 bg-zinc-950 border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer focus:bg-zinc-950"
                      >
                        <option value={5}>Short Sprint (5 Questions)</option>
                        <option value={10}>Standard (10 Questions)</option>
                        <option value={15}>Full Simulation (15 Questions)</option>
                      </select>
                    </div>

                    {/* Question Mix Focus Select */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Question Mix Focus
                      </label>
                      <select
                        value={questionMix}
                        onChange={(e) => setQuestionMix(e.target.value)}
                        className="focus-ring-premium block w-full py-3 px-4 bg-zinc-950 border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer focus:bg-zinc-950"
                      >
                        <option value="balanced">Balanced Mix (Technical, Project-based, Behavioral, Role-specific)</option>
                        <option value="technical">Technical Focus (Technical + Project-based only)</option>
                        <option value="behavioral">Behavioral Focus (Behavioral questions only)</option>
                      </select>
                    </div>

                    {/* Timer limit Select */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} /> Time Limit Per Question
                      </label>
                      <select
                        value={timeLimit === null ? 'none' : timeLimit}
                        onChange={(e) => setTimeLimit(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                        className="focus-ring-premium block w-full py-3 px-4 bg-zinc-950 border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer focus:bg-zinc-950"
                      >
                        <option value="none">No time limit (Relaxed Practice)</option>
                        <option value={60}>1 Minute (60 seconds) - Fast Paced</option>
                        <option value={120}>2 Minutes (120 seconds) - Balanced pressure</option>
                        <option value={180}>3 Minutes (180 seconds) - Detailed Answers</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <GlowButton
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 text-xs font-bold uppercase tracking-wider"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" strokeWidth={1.5} />
                      ) : (
                        <>
                          Enter Mock Interview Room <Play className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
                        </>
                      )}
                    </GlowButton>
                  </div>
                </form>
              </div>
            </MotionItem>
          </MotionContainer>
        )}
      </main>
    </div>
  );
}
