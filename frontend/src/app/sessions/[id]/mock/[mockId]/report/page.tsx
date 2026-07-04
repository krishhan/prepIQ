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
  TrendingUp, Star, AlertTriangle, LayoutDashboard, ChevronDown, ListFilter
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
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 text-sm font-semibold">Generating report cards...</p>
      </div>
    );
  }

  if (error || !mock || !mock.full_report) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="glass-panel p-12 rounded-3xl text-center border border-zinc-800 max-w-md">
          <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-200">Report Not Found</h3>
          <p className="text-zinc-500 text-sm mt-2 mb-6">
            {error || "This interview has not generated its report cards yet. Wait for evaluations to complete."}
          </p>
          <Link
            href={`/sessions/${sessionId}`}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-2xl text-sm font-semibold text-white border border-zinc-800 transition-colors"
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
    { subject: 'Technical', score: report.category_scores.technical_knowledge, fullMark: 100 },
    { subject: 'Project', score: report.category_scores.project_understanding, fullMark: 100 },
    { subject: 'Behavioral', score: report.category_scores.behavioral, fullMark: 100 },
    { subject: 'Communication', score: report.category_scores.communication, fullMark: 100 },
    { subject: 'Problem Solving', score: report.category_scores.problem_solving, fullMark: 100 },
  ];

  // Hiring recommendation coloring helper
  const rec = mock.hiring_recommendation || 'Maybe';
  let recStyles = "bg-amber-500/10 border-amber-500/20 text-amber-400";
  if (rec === 'Strong Yes') recStyles = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5";
  else if (rec === 'Yes') recStyles = "bg-emerald-500/10 border-emerald-500/20 text-emerald-300";
  else if (rec === 'No') recStyles = "bg-red-500/10 border-red-500/20 text-red-400";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation & actions Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href={`/sessions/${sessionId}`}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Question Bank
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>

        {/* Overview Score Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Big score Dial */}
          <div className="lg:col-span-4 glass-panel p-8 rounded-3xl border border-zinc-800 text-center flex flex-col justify-center items-center relative">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-6">Overall Score</span>
            <div className="relative w-44 h-44 flex items-center justify-center bg-indigo-500/5 rounded-full border border-indigo-500/10 shadow-inner">
              {/* Spinning background track for decoration */}
              <div className="absolute inset-2 rounded-full border border-zinc-800" />
              <div className="absolute inset-2 rounded-full border-t-2 border-indigo-500 animate-spin duration-3000" />
              
              <div className="text-center z-10">
                <span className="text-5xl font-black text-white">{mock.overall_score}%</span>
              </div>
            </div>
            
            {/* Hiring recommendation status card */}
            <div className={`mt-8 px-6 py-2 border rounded-full text-xs font-extrabold tracking-wide uppercase ${recStyles}`}>
              Recommendation: {rec}
            </div>
          </div>

          {/* Report summary overview */}
          <div className="lg:col-span-8 glass-panel p-8 rounded-3xl border border-zinc-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold text-zinc-100 flex items-center gap-2">
                <Award className="w-6 h-6 text-indigo-400" /> Interview Summary Report
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line font-medium">
                {report.overall_summary}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-900 pt-6">
              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Total Questions</span>
                <span className="text-lg font-black text-zinc-200 mt-1 block">{mock.question_count}</span>
              </div>
              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Mix Focus</span>
                <span className="text-lg font-black text-zinc-200 mt-1 block capitalize">{mock.question_mix}</span>
              </div>
              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Timer Limit</span>
                <span className="text-lg font-black text-zinc-200 mt-1 block">
                  {mock.time_limit_per_question ? `${mock.time_limit_per_question}s` : 'None'}
                </span>
              </div>
              <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Finished On</span>
                <span className="text-lg font-black text-zinc-200 mt-1 block truncate">
                  {mock.completed_at ? new Date(mock.completed_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Spider Chart & Strengths / Gaps row */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Radar Chart Display */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-zinc-800 flex flex-col justify-center min-h-[350px]">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-6 text-center">Category Scorecard</span>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={11} fontWeight={600} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#3f3f46" tickCount={6} />
                  <Radar name="Candidate" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                    labelStyle={{ color: '#f4f4f5', fontWeight: 700 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Strengths & Critical Gaps list cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Top Strengths
              </h3>
              <ul className="space-y-3">
                {report.top_strengths.map((str, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs text-zinc-400 leading-relaxed font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Critical Gaps */}
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Critical Gaps
              </h3>
              <ul className="space-y-3">
                {report.critical_gaps.map((gap, idx) => (
                  <li key={idx} className="flex gap-2.5 items-start text-xs text-zinc-400 leading-relaxed font-medium">
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
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4 bg-emerald-500/[0.01]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-emerald-500/10" /> Strongest Response
            </h3>
            <div className="space-y-2">
              <p className="font-bold text-zinc-200 text-sm leading-snug">"{report.best_answer.question}"</p>
              <p className="text-zinc-400 text-xs leading-relaxed pt-2 border-t border-zinc-900 font-medium">
                <strong className="text-zinc-300 font-bold block mb-1">Reasoning:</strong>
                {report.best_answer.reason}
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4 bg-red-500/[0.01]">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Area to Focus Most
            </h3>
            <div className="space-y-2">
              <p className="font-bold text-zinc-200 text-sm leading-snug">"{report.weakest_answer.question}"</p>
              <p className="text-zinc-400 text-xs leading-relaxed pt-2 border-t border-zinc-900 font-medium">
                <strong className="text-zinc-300 font-bold block mb-1">Reasoning:</strong>
                {report.weakest_answer.reason}
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap Table list */}
        <section className="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Improvement Roadmap Suggestions
          </h3>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                  <th className="pb-3 pr-4">Area Focus</th>
                  <th className="pb-3 pr-4">Suggestion Description</th>
                  <th className="pb-3 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-400 font-medium">
                {report.improvement_roadmap.map((item, idx) => {
                  const isHigh = item.priority === 'High';
                  const isLow = item.priority === 'Low';
                  return (
                    <tr key={idx} className="hover:bg-zinc-900/10">
                      <td className="py-3.5 pr-4 font-bold text-zinc-200 capitalize">{item.area}</td>
                      <td className="py-3.5 pr-4 leading-relaxed">{item.suggestion}</td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider border ${
                          isHigh
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : isLow
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
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
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-5">
            <ListFilter className="w-4 h-4" /> Detailed Responses Review
          </h3>
          
          <div className="space-y-4">
            {answers.map((ans, idx) => {
              const q = questions.find(question => question.id === ans.question);
              if (!q) return null;
              
              const isExpanded = expandedIndex === idx;
              
              // Status formatting
              let typeLabel = `Q${idx + 1}`;
              let borderClass = isExpanded ? 'border-zinc-700 bg-zinc-900/20' : 'border-zinc-850';
              let scoreColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
              
              if (ans.was_skipped) {
                typeLabel += " (Skipped)";
                borderClass = "border-zinc-850 hover:border-zinc-800 opacity-80";
                scoreColor = "text-zinc-500 bg-zinc-900 border-zinc-850";
              } else if (ans.was_timed_out) {
                typeLabel += " (Timed Out)";
                borderClass = "border-zinc-850 hover:border-zinc-800 opacity-80";
                scoreColor = "text-red-400 bg-red-500/10 border-red-500/20";
              }

              return (
                <div key={ans.id} className={`glass-panel rounded-2xl border transition-all duration-300 ${borderClass}`}>
                  <div
                    onClick={() => toggleQuestion(idx)}
                    className="p-5 flex items-start gap-4 cursor-pointer select-none"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {typeLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          {q.category}
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-200 leading-snug">
                        {q.question_text}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Circle score */}
                      <div className={`px-2.5 py-1 text-xs font-black rounded-lg border flex items-center justify-center ${scoreColor}`}>
                        {ans.was_skipped ? '0/10' : ans.was_timed_out ? '1/10' : `${ans.per_question_score}/10`}
                      </div>
                      <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-zinc-900 pt-4 space-y-5 text-sm">
                      {/* Submitted response */}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Response</span>
                        <blockquote className="text-zinc-300 bg-zinc-950 p-4 border-l-2 border-indigo-500 rounded-r-2xl mt-1.5 leading-relaxed font-medium italic">
                          {ans.was_skipped ? "[Skipped this question]" : ans.was_timed_out ? "[Question timed out before submission]" : `"${ans.user_answer}"`}
                        </blockquote>
                      </div>

                      {/* Question AI Evaluation Feedback */}
                      {!ans.was_skipped && ans.per_question_feedback && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">Strengths</span>
                              <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1 pl-0.5">
                                {ans.per_question_feedback.strengths.map((str, sIdx) => (
                                  <li key={sIdx} className="leading-relaxed">{str}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block mb-1.5">Key Missed Points</span>
                              {ans.per_question_feedback.missed_points.length === 0 ? (
                                <p className="text-zinc-500 text-xs italic pl-0.5 mt-1">None! Excellent coverage of all key points.</p>
                              ) : (
                                <ul className="list-disc list-inside text-zinc-400 text-xs space-y-1 pl-0.5">
                                  {ans.per_question_feedback.missed_points.map((miss, mIdx) => (
                                    <li key={mIdx} className="leading-relaxed">{miss}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-2">AI-Improved Response Draft</span>
                            <div className="p-4 bg-zinc-950/85 border border-zinc-900 rounded-2xl text-zinc-400 text-xs leading-relaxed max-h-52 overflow-y-auto whitespace-pre-line font-medium">
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
