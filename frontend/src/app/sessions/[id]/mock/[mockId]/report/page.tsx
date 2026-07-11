'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Header from 'src/components/Header';
import { mockApi } from 'src/lib/api';
import { MockInterview, InterviewQuestion, MockAnswer, MockReport } from 'src/lib/types';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';
import {
  ArrowLeft, AlertCircle, Award, CheckCircle, HelpCircle,
  TrendingUp, Star, AlertTriangle, LayoutDashboard, ChevronDown, ListFilter, CheckCircle2, Loader2
} from 'lucide-react';

export default function MockReportPage({ params }: { params: Promise<{ id: string; mockId: string }> }) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const mockId = parseInt(resolvedParams.mockId, 10);

  const [mock, setMock] = useState<MockInterview | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<MockAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion state for question review
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const res = await mockApi.report(mockId);
        setMock(res.mock);
        setQuestions(res.questions);
        setAnswers(res.answers);
      } catch (err) {
        setError("Failed to retrieve interview report details.");
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [mockId]);

  const toggleQuestion = (idx: number) => {
    setExpandedIndex(prev => (prev === idx ? null : idx));
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" strokeWidth={1.5} />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Generating report cards...</p>
      </div>
    );
  }

  if (error || !mock || !mock.full_report) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6">
        <div className="premium-card p-12 text-center max-w-md w-full flex flex-col items-center">
          <AlertCircle className="w-10 h-10 text-zinc-500 mb-4" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-zinc-200">Report Not Found</h3>
          <p className="text-zinc-500 text-xs mt-2 mb-6 font-medium">
            {error || "This interview has not generated its report cards yet. Wait for evaluations to complete."}
          </p>
          <Link
            href={`/sessions/${sessionId}`}
            className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-white border border-white/[0.06] transition-colors"
          >
            Return to Question Bank
          </Link>
        </div>
      </div>
    );
  }

  const report = mock.full_report as MockReport;

  // Prepare radar chart data
  const chartData = [
    { subject: 'Technical', score: report.category_scores.technical_knowledge, fullMark: 10 },
    { subject: 'Project', score: report.category_scores.project_understanding, fullMark: 10 },
    { subject: 'Behavioral', score: report.category_scores.behavioral, fullMark: 10 },
    { subject: 'Communication', score: report.category_scores.communication, fullMark: 10 },
    { subject: 'Problem Solving', score: report.category_scores.problem_solving, fullMark: 10 },
  ];

  // Hiring recommendation coloring helper
  const rec = mock.hiring_recommendation || 'Maybe';
  let recStyles = "bg-amber-500/5 border-amber-500/10 text-amber-400";
  if (rec === 'Strong Yes') recStyles = "bg-emerald-500/5 border-emerald-500/15 text-emerald-400 shadow-md shadow-emerald-500/5";
  else if (rec === 'Yes') recStyles = "bg-emerald-500/5 border-emerald-500/10 text-emerald-400";
  else if (rec === 'No') recStyles = "bg-red-500/5 border-red-500/10 text-red-400";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 sm:px-8 space-y-10 animate-fade-in">
        
        {/* Navigation & actions Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back to Question Bank
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0c0c0e] border border-white/[0.06] hover:bg-zinc-900 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.5} /> Return to Dashboard
          </Link>
        </div>

        {/* Overview Score Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Big score Dial */}
          <div className="lg:col-span-4 premium-card p-8 text-center flex flex-col justify-center items-center relative">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-6">Overall Score</span>
            <div className="relative w-40 h-40 flex items-center justify-center bg-violet-500/5 rounded-full border border-violet-500/10">
              <div className="absolute inset-1.5 rounded-full border border-white/[0.02]" />
              <div className="absolute inset-1.5 rounded-full border-t border-violet-500 animate-spin duration-3000" />
              
              <div className="text-center z-10">
                <span className="text-4xl font-black text-white">{mock.overall_score}%</span>
              </div>
            </div>
            
            {/* Hiring recommendation status card */}
            <div className={`mt-8 px-6 py-2 border rounded-full text-[10px] font-bold tracking-wider uppercase ${recStyles}`}>
              Recommendation: {rec}
            </div>
          </div>

          {/* Report summary overview */}
          <div className="lg:col-span-8 premium-card p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                <Award className="w-5 h-5 text-violet-400" strokeWidth={1.5} /> Interview Summary Report
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
                {report.overall_summary}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/[0.04] pt-6">
              <div className="bg-[#0c0c0e]/30 p-4 rounded-xl border border-white/[0.03]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Total Questions</span>
                <span className="text-base font-black text-zinc-200 mt-1 block">{mock.question_count}</span>
              </div>
              <div className="bg-[#0c0c0e]/30 p-4 rounded-xl border border-white/[0.03]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Mix Focus</span>
                <span className="text-base font-black text-zinc-200 mt-1 block capitalize">{mock.question_mix}</span>
              </div>
              <div className="bg-[#0c0c0e]/30 p-4 rounded-xl border border-white/[0.03]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Timer Limit</span>
                <span className="text-base font-black text-zinc-200 mt-1 block">
                  {mock.time_limit_per_question ? `${mock.time_limit_per_question}s` : 'None'}
                </span>
              </div>
              <div className="bg-[#0c0c0e]/30 p-4 rounded-xl border border-white/[0.03]">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Finished On</span>
                <span className="text-base font-black text-zinc-200 mt-1 block truncate">
                  {mock.completed_at ? new Date(mock.completed_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Spider Chart & Strengths / Gaps row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Radar Chart Display */}
          <div className="lg:col-span-5 premium-card p-6 flex flex-col justify-center min-h-[350px]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-6 text-center">Category Scorecard</span>
            <div className="w-full h-60">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                  <PolarGrid stroke="rgba(255,255,255,0.03)" />
                  <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={10} fontWeight={700} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="rgba(255,255,255,0.05)" tickCount={6} />
                  <Radar name="Candidate" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 800 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Strengths & Critical Gaps list cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" strokeWidth={1.5} /> Top Strengths
              </h3>
              <ul className="space-y-3 font-medium text-xs leading-relaxed text-zinc-400">
                {report.top_strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Gaps */}
            <div className="premium-card p-6 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> Critical Gaps
              </h3>
              <ul className="space-y-3 font-medium text-xs leading-relaxed text-zinc-400">
                {report.critical_gaps.map((gap, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Best & Weakest answers row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="premium-card p-6 space-y-4 border-emerald-500/[0.04]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Star className="w-4 h-4" strokeWidth={1.5} /> Strongest Response
            </h3>
            <div className="space-y-3">
              <p className="font-bold text-zinc-200 text-sm leading-snug">"{report.best_answer.question}"</p>
              <div className="text-zinc-400 text-xs leading-relaxed pt-3 border-t border-white/[0.03] font-medium space-y-1">
                <strong className="text-zinc-300 font-bold block text-[10px] uppercase tracking-wider">Reasoning:</strong>
                <p>{report.best_answer.reason}</p>
              </div>
            </div>
          </div>

          <div className="premium-card p-6 space-y-4 border-red-500/[0.04]">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" strokeWidth={1.5} /> Area to Focus Most
            </h3>
            <div className="space-y-3">
              <p className="font-bold text-zinc-200 text-sm leading-snug">"{report.weakest_answer.question}"</p>
              <div className="text-zinc-400 text-xs leading-relaxed pt-3 border-t border-white/[0.03] font-medium space-y-1">
                <strong className="text-zinc-300 font-bold block text-[10px] uppercase tracking-wider">Reasoning:</strong>
                <p>{report.weakest_answer.reason}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Table list */}
        <section className="premium-card p-6 space-y-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" strokeWidth={1.5} /> Improvement Roadmap Suggestions
          </h3>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pr-4">Area Focus</th>
                  <th className="pb-3 pr-4">Suggestion Description</th>
                  <th className="pb-3 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-400 font-medium">
                {report.improvement_roadmap.map((item, idx) => {
                  const isHigh = item.priority === 'High';
                  const isLow = item.priority === 'Low';
                  return (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3.5 pr-4 font-bold text-zinc-200 capitalize">{item.area}</td>
                      <td className="py-3.5 pr-4 leading-relaxed">{item.suggestion}</td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${
                          isHigh
                            ? 'bg-red-500/5 border-red-500/20 text-red-400'
                            : isLow
                              ? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
                              : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Question Review List */}
        <section className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <ListFilter className="w-4 h-4" strokeWidth={1.5} /> Detailed Responses Review
          </h3>
          
          <div className="space-y-4">
            {answers.map((ans, idx) => {
              const q = questions.find(question => question.id === ans.question);
              if (!q) return null;
              
              const isExpanded = expandedIndex === idx;
              
              // Status formatting
              let typeLabel = `Q${idx + 1}`;
              let borderClass = isExpanded ? 'border-violet-500/20 bg-zinc-950/20' : 'border-white/[0.04]';
              let scoreColor = "text-violet-400 bg-violet-500/5 border-violet-500/10";
              
              if (ans.was_skipped) {
                typeLabel += " (Skipped)";
                borderClass = "border-white/[0.04] opacity-80";
                scoreColor = "text-zinc-500 bg-zinc-900/30 border-white/[0.04]";
              } else if (ans.was_timed_out) {
                typeLabel += " (Timed Out)";
                borderClass = "border-white/[0.04] opacity-80";
                scoreColor = "text-red-400 bg-red-500/5 border-red-500/10";
              }

              return (
                <div key={ans.id} className={`premium-card overflow-hidden ${borderClass} ${isExpanded ? 'accordion-premium-active' : ''}`}>
                  <div
                    onClick={() => toggleQuestion(idx)}
                    className="p-5 flex items-start gap-4 cursor-pointer select-none"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                          {typeLabel}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/5 border border-violet-500/10">
                          {q.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-zinc-200 leading-snug tracking-tight">
                        {q.question_text}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 self-center">
                      {/* Circle score */}
                      <div className={`px-2.5 py-1 text-[10px] font-black rounded-lg border flex items-center justify-center ${scoreColor}`}>
                        {ans.was_skipped ? '0/10' : ans.was_timed_out ? '1/10' : `${ans.per_question_score}/10`}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-250 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-6 border-t border-white/[0.03] pt-5 space-y-6 text-xs sm:text-sm animate-fade-in">
                      {/* Submitted response */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your Response</span>
                        <blockquote className="text-zinc-300 bg-[#0c0c0e] p-4 border-l-2 border-violet-500 rounded-r-xl leading-relaxed font-medium italic">
                          {ans.was_skipped ? "[Skipped this question]" : ans.was_timed_out ? "[Question timed out before submission]" : `"${ans.user_answer}"`}
                        </blockquote>
                      </div>

                      {/* Question AI Evaluation Feedback */}
                      {!ans.was_skipped && ans.per_question_feedback && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Strengths</span>
                              <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 pl-0.5 leading-relaxed font-medium">
                                {ans.per_question_feedback.strengths.map((str, sIdx) => (
                                  <li key={sIdx} className="marker:text-zinc-650">{str}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Key Missed Points</span>
                              {ans.per_question_feedback.missed_points.length === 0 ? (
                                <p className="text-zinc-500 text-xs italic pl-0.5">None! Excellent coverage of all key points.</p>
                              ) : (
                                <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1.5 pl-0.5 leading-relaxed font-medium">
                                  {ans.per_question_feedback.missed_points.map((miss, mIdx) => (
                                    <li key={mIdx} className="marker:text-zinc-650">{miss}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">AI-Improved Response Draft</span>
                            <div className="p-4 bg-[#0c0c0e] border border-white/[0.04] rounded-xl text-zinc-400 text-xs leading-relaxed max-h-52 overflow-y-auto whitespace-pre-line font-medium">
                              {ans.per_question_feedback.improved_answer}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
