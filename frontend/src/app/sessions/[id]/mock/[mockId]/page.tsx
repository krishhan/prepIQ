'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from 'src/components/Header';
import { mockApi } from 'src/lib/api';
import { MockInterview, InterviewQuestion } from 'src/lib/types';
import { AlertCircle, Clock, ArrowRight, ShieldAlert, Cpu, Loader2 } from 'lucide-react';
import { GlowButton, FloatingBackground } from 'src/components/MotionComponents';

const EVALUATION_STEPS = [
  "Evaluating your responses...",
  "Assembling category scorecards...",
  "Preparing roadmap recommendations...",
  "Finalizing report card!"
];

export default function LiveMockPage({ params }: { params: Promise<{ id: string; mockId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  const mockId = parseInt(resolvedParams.mockId, 10);
  const router = useRouter();

  const [mock, setMock] = useState<MockInterview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Active state indicators
  const [userAnswer, setUserAnswer] = useState('');
  const [showTransition, setShowTransition] = useState(true);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0); // stopwatch fallback
  
  // Polling for report status
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeStep, setFinalizeStep] = useState(0);

  // Keep references to handle intervals cleanly
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let active = true;

    const loadMock = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await mockApi.detail(mockId);
        if (!active) return;
        setMock(res.mock);
        setQuestions(res.questions);
        
        // If mock is already completed, redirect to report immediately
        if (res.mock.status === 'completed') {
          router.push(`/sessions/${sessionId}/mock/${mockId}/report`);
          return;
        }
        if (res.mock.status === 'failed') {
          setError(res.mock.error_message || "This mock interview failed during grading.");
          return;
        }
        
        // If mock is in processing state (generating report), poll immediately
        if (res.mock.status === 'processing') {
          beginReportPolling();
          return;
        }
        
        // Initialize transition screen
        startTransition();
      } catch (err) {
        if (active) {
          setError("Failed to retrieve mock interview details.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMock();

    return () => {
      active = false;
      clearAllTimers();
    };
  }, [mockId, sessionId]);

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (transitionRef.current) clearInterval(transitionRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
  };

  // 3s Transition Breath Screen
  const startTransition = () => {
    clearAllTimers();
    setUserAnswer('');
    setShowTransition(true);
    setTransitionCountdown(3);

    transitionRef.current = setInterval(() => {
      setTransitionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(transitionRef.current!);
          setShowTransition(false);
          // Start the active question timer
          startQuestionTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Clock/Stopwatch calculations
  const startQuestionTimer = async () => {
    clearAllTimers();
    
    try {
      // Fetch latest mock state to align started_at
      const res = await mockApi.detail(mockId);
      
      // Clear again to prevent duplicate intervals started during fetch transit
      clearAllTimers();
      
      setMock(res.mock);
      
      const startedAt = res.mock.question_started_at ? new Date(res.mock.question_started_at).getTime() : new Date().getTime();
      const limit = res.mock.time_limit_per_question;
  
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startedAt) / 1000);
  
        if (limit) {
          const remaining = limit - elapsed;
          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            setSecondsRemaining(0);
            // AUTO SUBMIT TIMEOUT
            handleAutoTimeout();
          } else {
            setSecondsRemaining(remaining);
          }
        } else {
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    } catch (err) {
      console.error("Failed to sync question timer", err);
    }
  };

  // Timeout triggers an empty answer submit
  const handleAutoTimeout = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const activeQ = questions[mock!.current_question_index];
      await mockApi.submitAnswer(mockId, activeQ.id, "");
      const res = await mockApi.detail(mockId);
      advanceOrComplete(res.mock);
    } catch (err: any) {
      setError("Timer expired, but auto-submission failed. Please click submit manually.");
      setSubmitting(false);
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || !mock) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const activeQ = questions[mock.current_question_index];
      await mockApi.submitAnswer(mockId, activeQ.id, userAnswer);
      const res = await mockApi.detail(mockId);
      advanceOrComplete(res.mock);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to submit answer. Please try again.");
      setSubmitting(false);
    }
  };

  // Skip Question
  const handleSkipQuestion = async () => {
    if (submitting || !mock) return;
    if (!confirm("Are you sure you want to skip this question? Skipping scores 0 points directly for this question.")) {
      return;
    }
    
    setSubmitting(true);
    setError(null);

    try {
      const activeQ = questions[mock.current_question_index];
      await mockApi.skipQuestion(mockId, activeQ.id);
      const res = await mockApi.detail(mockId);
      advanceOrComplete(res.mock);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to skip question. Please try again.");
      setSubmitting(false);
    }
  };

  // Complete Early
  const handleCompleteEarly = async () => {
    if (submitting || !mock) return;
    if (!confirm("Are you sure you want to complete the interview early? All unanswered questions will be marked as timed out.")) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    clearAllTimers();

    try {
      await mockApi.complete(mockId);
      beginReportPolling();
    } catch (err: any) {
      setError("Failed to terminate interview early.");
      setSubmitting(false);
      startQuestionTimer();
    }
  };

  // Advances mock state or completes
  const advanceOrComplete = (updatedMock: MockInterview) => {
    setSubmitting(false);
    setMock(updatedMock);

    // If mock status is processing or all questions are answered, complete mock
    if (updatedMock.status === 'processing' || updatedMock.current_question_index >= updatedMock.question_count) {
      if (updatedMock.status !== 'processing') {
        setSubmitting(true);
        mockApi.complete(mockId)
          .then((finalMock) => {
            setMock(finalMock);
            beginReportPolling();
          })
          .catch((err) => {
            console.error("Auto-completion error", err);
            beginReportPolling();
          })
          .finally(() => {
            setSubmitting(false);
          });
      } else {
        beginReportPolling();
      }
    } else {
      // Load next question with transition buffer
      startTransition();
    }
  };

  // Enter Polling state
  const beginReportPolling = () => {
    clearAllTimers();
    setIsFinalizing(true);
    setFinalizeStep(0);
    
    // Cycle evaluation loading steps in background UI
    stepIntervalRef.current = setInterval(() => {
      setFinalizeStep((prev) => (prev < EVALUATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);

    const pollStatus = async () => {
      try {
        const res = await mockApi.status(mockId);
        if (res.status === 'completed') {
          clearAllTimers();
          router.push(`/sessions/${sessionId}/mock/${mockId}/report`);
        } else if (res.status === 'failed') {
          clearAllTimers();
          setIsFinalizing(false);
          setError(res.error_message || "AI report generation failed.");
        }
      } catch (err) {
        clearAllTimers();
        setIsFinalizing(false);
        setError("Failed to check report generation progress.");
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 2500);
  };

  // Helper formatting for seconds to MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6 min-h-screen relative overflow-hidden">
        <FloatingBackground />
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" strokeWidth={1.5} />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest z-10">Entering interview room...</p>
      </div>
    );
  }

  // Report generating loading screen
  if (isFinalizing) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6 min-h-screen relative overflow-hidden">
        <FloatingBackground />
        <div className="text-center space-y-6 max-w-md w-full z-10">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="inline-flex p-5 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-3xl mb-4"
          >
            <Cpu className="w-8 h-8" strokeWidth={1.5} />
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.h2 
              key={finalizeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-black tracking-tight text-white"
            >
              {EVALUATION_STEPS[finalizeStep]}
            </motion.h2>
          </AnimatePresence>
          
          <p className="text-zinc-500 text-xs leading-relaxed font-medium">
            Please keep this tab open. Our AI coach is processing transcripts, computing category metrics, and assembling your personalized preparation roadmap.
          </p>

          <div className="pt-4">
            <div className="w-full bg-[#0c0c0e] h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
              <motion.div 
                className="bg-violet-600 h-full rounded-full"
                animate={{ width: `${((finalizeStep + 1) / EVALUATION_STEPS.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3s Transition Screen
  if (showTransition && mock && questions.length > 0) {
    const activeQuestion = questions[mock.current_question_index] || null;
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6 min-h-screen relative overflow-hidden">
        <FloatingBackground />
        <div className="text-center space-y-6 max-w-lg w-full z-10">
          <span className="text-[10px] font-bold tracking-widest text-violet-400 uppercase block">
            Upcoming Question
          </span>
          <AnimatePresence mode="wait">
            <motion.h2 
              key={transitionCountdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-7xl sm:text-8xl font-black text-white font-mono"
            >
              {transitionCountdown}
            </motion.h2>
          </AnimatePresence>
          {activeQuestion && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="premium-card p-6 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-white/[0.04] shadow-2xl rounded-3xl"
            >
              <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 px-2.5 py-0.5 rounded-full bg-violet-500/5 border border-violet-500/10 block w-fit mx-auto mb-3">
                {activeQuestion.category}
              </span>
              <p className="text-zinc-450 text-xs font-semibold italic leading-relaxed">
                "Focus and outline your answer clearly. We will start in a moment."
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  const activeQuestion = mock && questions.length > 0 ? questions[mock.current_question_index] : null;
  const isTimerCritical = mock?.time_limit_per_question && secondsRemaining < 15;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 sm:px-8 flex flex-col justify-between animate-fade-in relative z-10">
        
        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeQuestion && mock && (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Top progress row */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest">
                Question <span className="text-white font-black">{mock.current_question_index + 1}</span> of <span className="text-white font-black">{mock.question_count}</span>
              </div>
              
              {/* Timer badge */}
              <motion.div 
                animate={isTimerCritical ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isTimerCritical
                    ? 'bg-red-500/5 border-red-500/20 text-red-400'
                    : 'bg-zinc-950/40 border-white/[0.04] text-zinc-350 shadow-sm'
                }`}
              >
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="font-bold tabular-nums">
                  {mock.time_limit_per_question ? formatTime(secondsRemaining) : formatTime(elapsedSeconds)}
                </span>
              </motion.div>
            </div>

            {/* Overall progress indicator bar */}
            <div className="w-full bg-[#0c0c0e] h-1 rounded-full overflow-hidden border border-white/[0.04]">
              <motion.div 
                className="bg-violet-600 h-full rounded-full"
                animate={{ width: `${(mock.current_question_index / mock.question_count) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Question description card */}
            <motion.section 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="premium-card p-6 sm:p-8 space-y-4 my-6"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 px-2.5 py-0.5 rounded-full bg-violet-500/5 border border-violet-500/10">
                  {activeQuestion.category}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-550">
                  Hiring Focus
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight">
                {activeQuestion.question_text}
              </h1>
            </motion.section>

            {/* Candidate Answer form */}
            <motion.section 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex-1 flex flex-col space-y-4"
            >
              <form onSubmit={handleSubmitAnswer} className="flex-1 flex flex-col justify-between space-y-4">
                <div className="flex-1">
                  <textarea
                    rows={8}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    required
                    placeholder="Type your response here..."
                    className="focus-ring-premium block w-full p-4 h-full min-h-[220px] bg-zinc-950/40 border border-white/[0.06] hover:border-white/[0.1] rounded-2xl text-zinc-200 placeholder-zinc-700 text-xs sm:text-sm leading-relaxed font-medium focus:bg-zinc-950"
                  />
                </div>

                {/* Submits and controls */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-zinc-950/40 hover:bg-zinc-900 border border-white/[0.04] text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-center"
                  >
                    Skip Question
                  </button>

                  <GlowButton
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" strokeWidth={1.5} />
                    ) : (
                      <>
                        Submit Response <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </GlowButton>
                </div>
              </form>
            </motion.section>

            {/* Quick stats footer row with complete early trigger */}
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-6 mt-6">
              <span className="text-zinc-550 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.5} /> Responses are graded by PrepIQ AI Coach
              </span>
              <button
                onClick={handleCompleteEarly}
                className="text-xs font-bold text-red-500/70 hover:text-red-400 bg-transparent hover:bg-red-500/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/10 transition-colors cursor-pointer"
              >
                Complete Interview Early
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
