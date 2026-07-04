'use client';

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from 'src/components/Header';
import { mockApi } from 'src/lib/api';
import { MockInterview, InterviewQuestion, MockAnswer } from 'src/lib/types';
import { AlertCircle, Clock, AlertTriangle, ArrowRight, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

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
      const nextMock = await mockApi.complete(mockId);
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
    const stepInterval = setInterval(() => {
      setFinalizeStep((prev) => (prev < EVALUATION_STEPS.length - 1 ? prev + 1 : prev));
    }, 4000);

    const pollStatus = async () => {
      try {
        const res = await mockApi.status(mockId);
        if (res.status === 'completed') {
          clearInterval(stepInterval);
          clearInterval(pollInterval);
          router.push(`/sessions/${sessionId}/mock/${mockId}/report`);
        } else if (res.status === 'failed') {
          clearInterval(stepInterval);
          clearInterval(pollInterval);
          setIsFinalizing(false);
          setError(res.error_message || "AI report generation failed.");
        }
      } catch (err) {
        clearInterval(stepInterval);
        clearInterval(pollInterval);
        setIsFinalizing(false);
        setError("Failed to check report generation progress.");
      }
    };

    const pollInterval = setInterval(pollStatus, 2500);
  };

  // Helper formatting for seconds to MM:SS
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">Entering interview room...</p>
      </div>
    );
  }

  // Report generating loading screen
  if (isFinalizing) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="pulse-ring inline-flex p-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mb-4">
            <Cpu className="w-8 h-8 animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
            {EVALUATION_STEPS[finalizeStep]}
          </h2>
          
          <p className="text-zinc-500 text-sm">
            Please keep this tab open. Our AI coach is processing transcripts, computing category metrics, and assembling your personalized preparation roadmap.
          </p>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-850">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${((finalizeStep + 1) / EVALUATION_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3s Transition Screen
  if (showTransition && mock && questions.length > 0) {
    const activeQuestion = questions[mock.current_question_index] || null;
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-lg w-full">
          <span className="text-xs font-black tracking-widest text-indigo-400 uppercase block">
            Upcoming Question
          </span>
          <h2 className="text-5xl font-black text-white animate-scale">
            {transitionCountdown}
          </h2>
          {activeQuestion && (
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 block w-fit mx-auto mb-3">
                {activeQuestion.category}
              </span>
              <p className="text-zinc-400 text-sm leading-relaxed italic">
                "Focus and outline your action points clearly. We will start in a moment."
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const activeQuestion = mock && questions.length > 0 ? questions[mock.current_question_index] : null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-between">
        
        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeQuestion && mock && (
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Top progress row */}
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                Question <span className="text-zinc-200 font-black">{mock.current_question_index + 1}</span> of <span className="text-zinc-200 font-black">{mock.question_count}</span>
              </div>
              
              {/* Timer badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                mock.time_limit_per_question
                  ? secondsRemaining < 15
                    ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {mock.time_limit_per_question ? formatTime(secondsRemaining) : formatTime(elapsedSeconds)}
              </div>
            </div>

            {/* Overall progress indicator bar */}
            <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden border border-zinc-900">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(mock.current_question_index / mock.question_count) * 100}%` }}
              />
            </div>

            {/* Question description card */}
            <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-zinc-800 space-y-4 my-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  {activeQuestion.category}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Hiring Focus
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 leading-snug">
                {activeQuestion.question_text}
              </h1>
            </section>

            {/* Candidate Answer form */}
            <section className="flex-1 flex flex-col space-y-4">
              <form onSubmit={handleSubmitAnswer} className="flex-1 flex flex-col justify-between space-y-4">
                <div className="flex-1">
                  <textarea
                    rows={8}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    required
                    placeholder="Type your response here..."
                    className="block w-full p-4 h-full min-h-[180px] bg-zinc-900/40 border border-zinc-850 rounded-2xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm leading-relaxed"
                  />
                </div>

                {/* Submits and controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={submitting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-2xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Skip Question
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer flex justify-center items-center gap-1 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Submit Response <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Quick stats footer row with complete early trigger */}
            <div className="flex items-center justify-between border-t border-zinc-900 pt-6 mt-6">
              <span className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" /> Responses are graded by PrepIQ AI Coach
              </span>
              <button
                onClick={handleCompleteEarly}
                className="text-xs font-bold text-red-500 hover:text-red-400 bg-transparent hover:bg-red-500/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/10 transition-colors cursor-pointer"
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
