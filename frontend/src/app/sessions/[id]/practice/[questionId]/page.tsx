'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from 'src/components/Header';
import { questionsApi, sessionsApi } from 'src/lib/api';
import { InterviewQuestion, PracticeAttempt, ResumeSession } from 'src/lib/types';
import { ArrowLeft, AlertCircle, Send, Award, CheckCircle, HelpCircle, RefreshCw, MessageSquare, Clock } from 'lucide-react';
import DifficultyBadge from 'src/components/DifficultyBadge';
import { GlowButton, FloatingBackground, MotionContainer, MotionItem, AnimatedCard } from 'src/components/MotionComponents';

export default function PracticeQuestionPage({ params }: { params: Promise<{ id: string; questionId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const questionId = parseInt(resolvedParams.questionId, 10);

  const [session, setSession] = useState<ResumeSession | null>(null);
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [userAnswer, setUserAnswer] = useState('');
  const [latestAttempt, setLatestAttempt] = useState<PracticeAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionData = await sessionsApi.detail(sessionId);
      setSession(sessionData);
      
      // Fetch all questions for session to find the active one
      const questionsData = await sessionsApi.questions(sessionId);
      const activeQ = questionsData.find(q => q.id === questionId);
      if (activeQ) {
        setQuestion(activeQ);
      } else {
        setError("Question not found in this session.");
      }

      // Fetch past attempts
      const attemptsData = await questionsApi.attempts(questionId);
      setAttempts(attemptsData);
      if (attemptsData.length > 0) {
        setLatestAttempt(attemptsData[0]); // sorted by created_at desc in backend
        setUserAnswer(attemptsData[0].user_answer);
      }
    } catch (err) {
      setError("Failed to load question details or past attempts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId, questionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const newAttempt = await questionsApi.practice(questionId, userAnswer);
      setLatestAttempt(newAttempt);
      setAttempts([newAttempt, ...attempts]);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit answer for AI evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Stagger animation definitions
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 sm:px-8 space-y-8 z-10">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-550 hover:text-zinc-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back to Question Bank
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
          <div className="space-y-6 animate-pulse">
            <div className="h-40 bg-zinc-900/30 rounded-3xl" />
            <div className="h-60 bg-zinc-900/30 rounded-3xl" />
          </div>
        ) : !question ? (
          <div className="premium-card p-12 text-center max-w-md mx-auto flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-zinc-550 mb-4" strokeWidth={1.5} />
            <h3 className="text-base font-bold text-zinc-200">Question Not Found</h3>
            <p className="text-zinc-550 text-xs mt-2 mb-6 font-medium">The requested interview question could not be loaded.</p>
            <Link href={`/sessions/${sessionId}`}>
              <GlowButton variant="secondary" className="text-xs">
                Return to Question Bank
              </GlowButton>
            </Link>
          </div>
        ) : (
          <MotionContainer 
            className="space-y-8"
          >
            {/* Question Details Header Card */}
            <MotionItem>
              <AnimatedCard glowColor="rgba(139, 92, 246, 0.04)">
                <div className="flex flex-wrap gap-2 items-center mb-4">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/5 border border-violet-500/10">
                    {question.category}
                  </span>
                  <DifficultyBadge difficulty={question.difficulty} />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight mb-4">
                  {question.question_text}
                </h2>
                
                <div className="border-t border-white/[0.04] pt-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Why are hiring managers asking this?</span>
                  <p className="text-zinc-450 text-xs sm:text-sm leading-relaxed font-semibold">{question.why_asked}</p>
                </div>
              </AnimatedCard>
            </MotionItem>

            {/* Answer practice form and AI feedback side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Input panel */}
              <MotionItem className="lg:col-span-7">
                <AnimatedCard glowColor="rgba(139, 92, 246, 0.03)" className="space-y-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-violet-450" strokeWidth={1.5} /> Draft Your Response
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <textarea
                      rows={8}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      required
                      placeholder="Provide a detailed answer using the STAR method (Situation, Task, Action, Result) if behavioral, or outline your design/strategy decisions if technical..."
                      className="focus-ring-premium block w-full p-4 bg-zinc-950/40 border border-white/[0.06] hover:border-white/[0.1] rounded-2xl text-zinc-200 placeholder-zinc-700 text-xs sm:text-sm leading-relaxed font-medium focus:bg-zinc-950"
                    />

                    <GlowButton
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 text-xs"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Evaluating with AI Coach...
                        </>
                      ) : (
                        <>
                          Submit for Grading <Send className="w-4 h-4" strokeWidth={1.5} />
                        </>
                      )}
                    </GlowButton>
                  </form>
                </AnimatedCard>
              </MotionItem>

              {/* AI Feedback panel */}
              <MotionItem className="lg:col-span-5">
                <AnimatePresence mode="wait">
                  {latestAttempt ? (
                    <motion.div
                      key="feedback-present"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      <AnimatedCard glowColor="rgba(139, 92, 246, 0.05)" className="space-y-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-violet-450" strokeWidth={1.5} /> AI Coach Grading
                        </h3>

                        {/* Score display */}
                        <div className="flex items-center gap-4 bg-zinc-950/50 border border-white/[0.03] p-4 rounded-2xl">
                          <div className="w-14 h-14 rounded-xl bg-violet-500/5 border border-violet-500/10 flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-black text-violet-450 leading-none">{latestAttempt.ai_feedback.score}</span>
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-1">/ 10</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-zinc-550 text-[9px] uppercase font-bold tracking-wider">Communication Quality</span>
                            <p className="text-zinc-200 font-bold text-xs sm:text-sm">{latestAttempt.ai_feedback.communication_quality}</p>
                          </div>
                        </div>

                        {/* Strengths */}
                        <div className="border-t border-white/[0.04] pt-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> Strengths
                          </span>
                          <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 pl-0.5 font-semibold leading-relaxed">
                            {latestAttempt.ai_feedback.strengths.map((str, idx) => (
                              <li key={idx} className="marker:text-zinc-600">{str}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Gaps / Missed Points */}
                        <div className="border-t border-white/[0.04] pt-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> Key Gaps / Missed Points
                          </span>
                          {latestAttempt.ai_feedback.missed_points.length === 0 ? (
                            <p className="text-zinc-550 text-xs pl-0.5 italic font-semibold">None! Excellent coverage of all key points.</p>
                          ) : (
                            <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 pl-0.5 font-semibold leading-relaxed">
                              {latestAttempt.ai_feedback.missed_points.map((miss, idx) => (
                                <li key={idx} className="marker:text-zinc-600">{miss}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Polished Answer */}
                        <div className="border-t border-white/[0.04] pt-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">AI-Improved Response Draft</span>
                          <div className="p-4 bg-[#0c0c0e]/60 border border-white/[0.04] rounded-xl text-zinc-450 text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line font-semibold">
                            {latestAttempt.ai_feedback.improved_answer}
                          </div>
                        </div>
                      </AnimatedCard>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="feedback-missing"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <AnimatedCard glowColor="rgba(255, 255, 255, 0.01)" className="text-center flex flex-col justify-center items-center h-full min-h-[320px]">
                        <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-2xl mb-4 text-zinc-650">
                          <Award className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <p className="text-zinc-350 text-xs font-bold uppercase tracking-wider">No Evaluation Yet</p>
                        <p className="text-zinc-500 text-xs mt-2.5 max-w-xs leading-relaxed font-semibold">
                          Submit your drafted response on the left. The AI coach will grade your communication quality and provide an improved model answer.
                        </p>
                      </AnimatedCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </MotionItem>
            </div>

            {/* Historical Attempts Section */}
            {attempts.length > 1 && (
              <MotionItem>
                <AnimatedCard className="space-y-4" glowColor="rgba(255, 255, 255, 0.01)">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Past Practice Attempts ({attempts.length})</h3>
                  <div className="space-y-3">
                    {attempts.slice(1).map((attempt, index) => (
                      <motion.div
                        whileHover={{ x: 2 }}
                        key={attempt.id}
                        className="p-4 bg-zinc-950/40 border border-white/[0.04] hover:border-white/[0.08] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-semibold transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                            Attempt #{attempts.length - 1 - index} • {new Date(attempt.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-zinc-350 line-clamp-1 italic font-medium">"{attempt.user_answer}"</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">Communication: <strong className="text-zinc-300 font-bold">{attempt.ai_feedback.communication_quality}</strong></span>
                          <div className="px-2.5 py-1 bg-violet-500/5 border border-violet-500/10 text-violet-400 font-extrabold rounded-lg text-[10px] uppercase tracking-wider">
                            {attempt.ai_feedback.score} / 10
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatedCard>
              </MotionItem>
            )}
          </MotionContainer>
        )}
      </main>
    </div>
  );
}
