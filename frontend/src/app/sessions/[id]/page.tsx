'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Header from 'src/components/Header';
import DifficultyBadge from 'src/components/DifficultyBadge';
import { sessionsApi, questionsApi } from 'src/lib/api';
import { InterviewQuestion, ResumeSession, QuestionCategory, ConfidenceLevel } from 'src/lib/types';
import { BookOpen, Award, ArrowRight, Filter, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

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
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-6">
            <div className="h-10 bg-zinc-900 rounded-lg w-1/4 animate-pulse" />
            <div className="h-32 bg-zinc-900 rounded-3xl animate-pulse" />
            <div className="h-12 bg-zinc-900 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : !session ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-zinc-800">
            <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-200">Session Not Found</h3>
            <p className="text-zinc-500 text-sm mt-2 mb-6">This resume session does not exist or has been deleted.</p>
            <Link href="/dashboard" className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-sm font-semibold text-white border border-zinc-800 transition-colors">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Header info */}
            <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">{session.job_role}</h1>
                <p className="text-zinc-400 text-sm mt-1">{session.experience_level} • Resume: {session.resume_filename}</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Link
                  href={`/sessions/${sessionId}/mock/setup`}
                  className="flex-1 md:flex-none inline-flex justify-center items-center gap-1.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer"
                >
                  Start Mock Interview <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </section>

            {/* Statistics Bar */}
            <section className="glass-panel p-6 rounded-3xl border border-zinc-800 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">Preparation Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                {/* Progress bar */}
                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400 font-semibold">Practiced Questions</span>
                    <span className="text-indigo-400 font-extrabold">{practicedCount} / {totalCount} ({practicePercentage}%)</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-zinc-850">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${practicePercentage}%` }}
                    />
                  </div>
                </div>
                
                {/* Confidence values */}
                <div className="md:col-span-2 flex items-center justify-around gap-4 text-center">
                  <div className="p-3 px-6 bg-zinc-900/60 rounded-2xl border border-zinc-800 flex-1">
                    <span className="text-emerald-400 text-xl font-black block">{confidentCount}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Confident</span>
                  </div>
                  <div className="p-3 px-6 bg-zinc-900/60 rounded-2xl border border-zinc-800 flex-1">
                    <span className="text-amber-400 text-xl font-black block">{needsWorkCount}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Needs Work</span>
                  </div>
                  <div className="p-3 px-6 bg-zinc-900/60 rounded-2xl border border-zinc-800 flex-1">
                    <span className="text-zinc-400 text-xl font-black block">{notPracticedCount}</span>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Unpracticed</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tabs and Difficulty filters */}
            <section className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Difficulty selector */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-zinc-500" />
                <select
                  value={activeDifficulty}
                  onChange={(e) => setActiveDifficulty(e.target.value)}
                  className="w-full md:w-40 py-2.5 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none text-xs cursor-pointer focus:border-zinc-700"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </section>

            {/* Questions List */}
            <section className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="glass-panel p-10 rounded-3xl text-center border border-zinc-800">
                  <BookOpen className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">No questions match the selected filter criteria.</p>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const isExpanded = expandedId === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`glass-panel rounded-2xl border transition-all duration-300 ${
                        isExpanded ? 'border-zinc-700 bg-zinc-900/20' : 'border-zinc-850 hover:border-zinc-850'
                      }`}
                    >
                      {/* Accordion Trigger area */}
                      <div
                        onClick={() => toggleAccordion(q.id)}
                        className="p-5 flex items-start gap-4 cursor-pointer select-none"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                              {q.category}
                            </span>
                            <DifficultyBadge difficulty={q.difficulty} />
                            
                            {/* Confidence indicators inline */}
                            {q.confidence === 'confident' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                Confident
                              </span>
                            )}
                            {q.confidence === 'needs_work' && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                Needs Work
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-zinc-100 leading-snug">
                            {idx + 1}. {q.question_text}
                          </h4>
                        </div>
                        <button className="p-1.5 text-zinc-500 hover:text-zinc-300">
                          {isExpanded ? <ChevronDown className="w-5 h-5 rotate-180 transition-transform" /> : <ChevronDown className="w-5 h-5 transition-transform" />}
                        </button>
                      </div>

                      {/* Accordion Body details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-zinc-900 pt-4 space-y-5 text-sm">
                          {/* Why Asked */}
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Why are hiring managers asking this?</span>
                            <p className="text-zinc-400 mt-1.5 leading-relaxed">{q.why_asked}</p>
                          </div>

                          {/* Ideal Answer outline */}
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ideal Answer Outline</span>
                            <ul className="list-decimal list-inside space-y-1.5 text-zinc-400 mt-2 pl-1">
                              {q.ideal_answer_outline.map((point, pIdx) => (
                                <li key={pIdx} className="leading-relaxed">{point}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Confidence level setter + practice button */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-zinc-900">
                            {/* Confidence Selectors */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-zinc-500 font-semibold mr-1">Your Confidence:</span>
                              <button
                                onClick={() => handleConfidenceChange(q.id, 'not_practiced')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  !q.confidence || q.confidence === 'not_practiced'
                                    ? 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                                    : 'bg-transparent border border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:border-zinc-700'
                                }`}
                              >
                                Unpracticed
                              </button>
                              <button
                                onClick={() => handleConfidenceChange(q.id, 'needs_work')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  q.confidence === 'needs_work'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-amber-400/80 hover:border-amber-500/20'
                                }`}
                              >
                                Needs Work
                              </button>
                              <button
                                onClick={() => handleConfidenceChange(q.id, 'confident')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  q.confidence === 'confident'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-emerald-400/80 hover:border-emerald-500/20'
                                }`}
                              >
                                Confident
                              </button>
                            </div>

                            {/* Practice links */}
                            <Link
                              href={`/sessions/${sessionId}/practice/${q.id}`}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                            >
                              Practice and Get AI Feedback <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
