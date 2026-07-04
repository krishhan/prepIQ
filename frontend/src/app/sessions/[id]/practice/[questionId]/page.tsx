'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Header from 'src/components/Header';
import { questionsApi, sessionsApi } from 'src/lib/api';
import { InterviewQuestion, PracticeAttempt, ResumeSession } from 'src/lib/types';
import { ArrowLeft, AlertCircle, Send, Award, CheckCircle, HelpCircle, RefreshCw, ThumbsUp, MessageCircle } from 'lucide-react';
import DifficultyBadge from 'src/components/DifficultyBadge';

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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href={`/sessions/${sessionId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Question Bank
        </Link>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="h-40 bg-zinc-900 rounded-3xl animate-pulse" />
            <div className="h-60 bg-zinc-900 rounded-3xl animate-pulse" />
          </div>
        ) : !question ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-200">Question Not Found</h3>
            <p className="text-zinc-500 text-sm mt-2 mb-6">The requested interview question could not be loaded.</p>
            <Link href={`/sessions/${sessionId}`} className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-sm font-semibold text-white border border-zinc-800 transition-colors">
              Return to Question Bank
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Question Details Header Card */}
            <section className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  {question.category}
                </span>
                <DifficultyBadge difficulty={question.difficulty} />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 leading-snug">
                {question.question_text}
              </h2>
              
              <div className="border-t border-zinc-900 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Why are hiring managers asking this?</span>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{question.why_asked}</p>
              </div>
            </section>

            {/* Answer practice form and AI feedback side-by-side or stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Input panel */}
              <section className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-indigo-400" /> Draft Your Response
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <textarea
                    rows={8}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    required
                    placeholder="Provide a detailed answer using the STAR method (Situation, Task, Action, Result) if behavioral, or outline your design/strategy decisions if technical..."
                    className="block w-full p-4 bg-zinc-950 border border-zinc-850 rounded-2xl text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-sm leading-relaxed"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center items-center gap-1.5 py-4 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-sm font-bold text-white transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating with AI Coach...
                      </>
                    ) : (
                      <>
                        Submit for Grading <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </section>

              {/* AI Feedback panel */}
              <section className="lg:col-span-5 space-y-6">
                {latestAttempt ? (
                  <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-purple-400" /> AI Coach Grading
                    </h3>

                    {/* Score display */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-indigo-400">{latestAttempt.ai_feedback.score}</span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">/ 10</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Communication Quality</span>
                        <p className="text-zinc-200 font-bold mt-0.5">{latestAttempt.ai_feedback.communication_quality}</p>
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="border-t border-zinc-900 pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Strengths
                      </span>
                      <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 mt-2 pl-1">
                        {latestAttempt.ai_feedback.strengths.map((str, idx) => (
                          <li key={idx} className="leading-relaxed">{str}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps / Missed Points */}
                    <div className="border-t border-zinc-900 pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> Key Gaps / Missed Points
                      </span>
                      {latestAttempt.ai_feedback.missed_points.length === 0 ? (
                        <p className="text-zinc-500 text-xs mt-2 pl-1 italic">None! Excellent coverage of all key points.</p>
                      ) : (
                        <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 mt-2 pl-1">
                          {latestAttempt.ai_feedback.missed_points.map((miss, idx) => (
                            <li key={idx} className="leading-relaxed">{miss}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Polished Answer */}
                    <div className="border-t border-zinc-900 pt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">AI-Improved Response Draft</span>
                      <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-900 text-zinc-400 text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line font-medium">
                        {latestAttempt.ai_feedback.improved_answer}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-8 rounded-3xl text-center border border-zinc-800 flex flex-col justify-center items-center h-full min-h-[300px]">
                    <Award className="w-8 h-8 text-zinc-600 mb-3" />
                    <p className="text-zinc-500 text-sm font-semibold">No Evaluation Yet</p>
                    <p className="text-zinc-650 text-xs mt-1.5 max-w-xs leading-normal">
                      Submit your drafted response on the left. The AI coach will grade your communication quality and provide an improved model answer.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Historical Attempts Section */}
            {attempts.length > 1 && (
              <section className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Past Practice Attempts ({attempts.length})</h3>
                <div className="space-y-3">
                  {attempts.slice(1).map((attempt, index) => (
                    <div
                      key={attempt.id}
                      className="p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                          Attempt #{attempts.length - 1 - index} • {new Date(attempt.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-zinc-300 line-clamp-1 italic max-w-xl">"{attempt.user_answer}"</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-500">Communication: <strong className="text-zinc-300 font-semibold">{attempt.ai_feedback.communication_quality}</strong></span>
                        <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold rounded-lg text-xs">
                          {attempt.ai_feedback.score} / 10
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
