'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from 'src/components/Header';
import DifficultyBadge from 'src/components/DifficultyBadge';
import { sessionsApi, questionsApi } from 'src/lib/api';
import { InterviewQuestion, ResumeSession, QuestionCategory, ConfidenceLevel } from 'src/lib/types';
import { BookOpen, ArrowRight, Filter, ChevronDown, AlertCircle, CheckCircle2, CircleDot } from 'lucide-react';
import { GlowButton, MotionContainer, MotionItem } from 'src/components/MotionComponents';

const CATEGORIES: (QuestionCategory | 'All')[] = ['All', 'Technical', 'Project-Based', 'Behavioral', 'Role-Specific'];

export default function SessionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const sessionId = parseInt(resolvedParams.id, 10);
  
  const [session, setSession] = useState<ResumeSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering States
  const [activeCategory, setActiveCategory] = useState<QuestionCategory | 'All'>('All');
  const [activeDifficulty, setActiveDifficulty] = useState<string>('All');
  
  // Expanded Accordion State
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch Questions
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionData = await sessionsApi.detail(sessionId);
      setSession(sessionData);
      
      const questionData = await sessionsApi.questions(sessionId);
      setQuestions(questionData);
    } catch (err: any) {
      setError("Failed to load question bank. Please verify the URL or try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  // Handle confidence score update dynamically
  const handleConfidenceChange = async (questionId: number, level: ConfidenceLevel) => {
    try {
      await questionsApi.updateConfidence(questionId, level);
      
      // Update local state
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, confidence: level } : q));
    } catch (err) {
      alert("Failed to update confidence score. Please try again.");
    }
  };

  const toggleAccordion = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Calculations for Stats Bar
  const totalCount = questions.length;
  const confidentCount = questions.filter(q => q.confidence === 'confident').length;
  const needsWorkCount = questions.filter(q => q.confidence === 'needs_work').length;
  const notPracticedCount = questions.filter(q => !q.confidence || q.confidence === 'not_practiced').length;
  const practicedCount = confidentCount + needsWorkCount;
  const practicePercentage = totalCount > 0 ? Math.round((practicedCount / totalCount) * 100) : 0;

  // Filter logic
  const filteredQuestions = questions.filter(q => {
    const catMatch = activeCategory === 'All' || q.category === activeCategory;
    const diffMatch = activeDifficulty === 'All' || q.difficulty.toLowerCase() === activeDifficulty.toLowerCase();
    return catMatch && diffMatch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 sm:px-8 space-y-10 animate-fade-in">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-8 animate-pulse">
            <div className="h-6 bg-zinc-900 rounded-lg w-1/4" />
            <div className="h-32 bg-zinc-900 rounded-3xl" />
            <div className="h-10 bg-zinc-900 rounded-2xl" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-zinc-900 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : !session ? (
          <div className="premium-card p-12 text-center max-w-md mx-auto flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-zinc-500 mb-4" strokeWidth={1.5} />
            <h3 className="text-base font-bold text-zinc-200">Session Not Found</h3>
            <p className="text-zinc-500 text-xs mt-2 mb-6 font-medium">This resume session does not exist or has been deleted.</p>
            <Link href="/dashboard">
              <GlowButton variant="secondary" className="text-xs">
                Return to Dashboard
              </GlowButton>
            </Link>
          </div>
        ) : (
          <MotionContainer className="space-y-8">
            {/* Header info */}
            <MotionItem className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <h1 className="text-2.5xl sm:text-3.5xl font-black tracking-tight text-white">{session.job_role}</h1>
                <p className="text-zinc-500 text-xs font-medium">
                  {session.experience_level} • Resume: {session.resume_filename}
                </p>
              </div>
              <Link href={`/sessions/${sessionId}/mock/setup`} className="w-full sm:w-auto">
                <GlowButton className="w-full text-xs">
                  Start Mock Interview <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </GlowButton>
              </Link>
            </MotionItem>

            {/* Statistics Bar */}
            <MotionItem>
              <div className="premium-card p-6 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Preparation Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  {/* Progress bar */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-400">Practiced Questions</span>
                      <span className="text-violet-400 font-bold">{practicedCount} / {totalCount} ({practicePercentage}%)</span>
                    </div>
                    <div className="w-full bg-[#0c0c0e] h-1.5 rounded-full overflow-hidden border border-white/[0.04]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${practicePercentage}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-violet-600 h-full rounded-full"
                      />
                    </div>
                  </div>
                  {/* Confidence values */}
                  <div className="md:col-span-5 flex items-center justify-around gap-2.5 sm:gap-4 text-center">
                    <div className="p-2 sm:p-3 bg-[#0c0c0e]/40 rounded-xl border border-white/[0.03] flex-1 hover:border-emerald-500/10 transition-colors">
                      <span className="text-emerald-400 text-base sm:text-lg font-black block leading-none">{confidentCount}</span>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-zinc-500 tracking-wider block mt-1">Confident</span>
                    </div>
                    <div className="p-2 sm:p-3 bg-[#0c0c0e]/40 rounded-xl border border-white/[0.03] flex-1 hover:border-amber-500/10 transition-colors">
                      <span className="text-amber-400 text-base sm:text-lg font-black block leading-none">{needsWorkCount}</span>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-zinc-500 tracking-wider block mt-1">Needs Work</span>
                    </div>
                    <div className="p-2 sm:p-3 bg-[#0c0c0e]/40 rounded-xl border border-white/[0.03] flex-1 hover:border-white/10 transition-colors">
                      <span className="text-zinc-450 text-base sm:text-lg font-black block leading-none">{notPracticedCount}</span>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-zinc-500 tracking-wider block mt-1">Unpracticed</span>
                    </div>
                  </div>
                </div>
              </div>
            </MotionItem>

            {/* Tabs and Difficulty filters */}
            <MotionItem className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pt-2">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setExpandedId(null); // Collapse open accordion on tab switch
                    }}
                    className={`px-3.5 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10 scale-[1.02]'
                        : 'bg-zinc-950/40 border border-white/[0.04] text-zinc-550 hover:text-zinc-300 hover:border-white/[0.08]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Difficulty selector */}
              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                <select
                  value={activeDifficulty}
                  onChange={(e) => {
                    setActiveDifficulty(e.target.value);
                    setExpandedId(null);
                  }}
                  className="w-full md:w-44 py-2 px-3 bg-zinc-950 border border-white/[0.06] rounded-xl text-zinc-350 focus:outline-none text-xs font-semibold cursor-pointer focus:border-violet-500/40 focus:bg-zinc-950"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </MotionItem>

            {/* Questions List */}
            <MotionItem className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="premium-card p-16 text-center border-dashed border-white/[0.06]">
                  <BookOpen className="w-8 h-8 text-zinc-650 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-zinc-550 text-xs font-medium">No questions match the selected filter criteria.</p>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isExpanded = expandedId === q.id;
                  return (
                    <motion.div
                      layout="position"
                      key={q.id}
                      className={`premium-card overflow-hidden transition-all duration-300 bg-[var(--card-bg)] border ${
                        isExpanded ? 'accordion-premium-active border-violet-500/25 bg-zinc-950/15 shadow-2xl' : 'border-white/[0.03]'
                      }`}
                    >
                      {/* Accordion Trigger area */}
                      <div
                        onClick={() => toggleAccordion(q.id)}
                        className="p-5 flex items-start gap-4 cursor-pointer select-none"
                      >
                        <div className="flex-1 space-y-2.5">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/5 border border-violet-500/10">
                              {q.category}
                            </span>
                            <DifficultyBadge difficulty={q.difficulty} />
                            
                            {/* Confidence indicators inline */}
                            {q.confidence === 'confident' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={1.5} />
                                Confident
                              </span>
                            )}
                            {q.confidence === 'needs_work' && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/10">
                                <CircleDot className="w-2.5 h-2.5" strokeWidth={1.5} />
                                Needs Work
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-zinc-100 leading-snug tracking-tight">
                            {idx + 1}. {q.question_text}
                          </h4>
                        </div>
                        <button className="p-1.5 text-zinc-550 hover:text-zinc-350 self-center cursor-pointer transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-violet-400' : ''}`} strokeWidth={1.5} />
                        </button>
                      </div>

                      {/* Accordion Body details */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <div className="px-5 pb-6 border-t border-white/[0.03] pt-5 space-y-6 text-xs sm:text-sm">
                              {/* Why Asked */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Why are hiring managers asking this?</span>
                                <p className="text-zinc-400 leading-relaxed font-medium">{q.why_asked}</p>
                              </div>

                              {/* Ideal Answer outline */}
                              <div className="space-y-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ideal Answer Outline</span>
                                <ul className="list-decimal list-inside space-y-1.5 text-zinc-400 pl-0.5 font-medium leading-relaxed">
                                  {q.ideal_answer_outline.map((point, pIdx) => (
                                    <li key={pIdx} className="marker:text-zinc-600">{point}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Confidence level setter + practice button */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 border-t border-white/[0.03]">
                                {/* Confidence Selectors */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-2">Your Confidence:</span>
                                  <button
                                    onClick={() => handleConfidenceChange(q.id, 'not_practiced')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                      !q.confidence || q.confidence === 'not_practiced'
                                        ? 'bg-zinc-950 border-white/10 text-zinc-200 shadow-sm'
                                        : 'bg-transparent border-white/[0.03] text-zinc-550 hover:text-zinc-350 hover:border-white/10'
                                    }`}
                                  >
                                    Unpracticed
                                  </button>
                                  <button
                                    onClick={() => handleConfidenceChange(q.id, 'needs_work')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                      q.confidence === 'needs_work'
                                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-sm'
                                        : 'bg-transparent border-white/[0.03] text-zinc-550 hover:text-amber-400/80 hover:border-amber-500/20'
                                    }`}
                                  >
                                    Needs Work
                                  </button>
                                  <button
                                    onClick={() => handleConfidenceChange(q.id, 'confident')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                      q.confidence === 'confident'
                                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-sm'
                                        : 'bg-transparent border-white/[0.03] text-zinc-550 hover:text-emerald-400/80 hover:border-emerald-500/20'
                                    }`}
                                  >
                                    Confident
                                  </button>
                                </div>

                                {/* Practice links */}
                                <Link href={`/sessions/${sessionId}/practice/${q.id}`} className="w-full sm:w-auto">
                                  <GlowButton variant="secondary" className="w-full py-2.5 px-4 text-xs font-bold text-violet-400 hover:text-violet-300">
                                    Practice with AI Feedback <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                                  </GlowButton>
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </MotionItem>
          </MotionContainer>
        )}
      </main>
    </div>
  );
}
