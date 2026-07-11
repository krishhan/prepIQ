'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from 'src/components/Header';
import { sessionsApi } from 'src/lib/api';
import { Upload, AlertCircle, FileText, Cpu, Loader2 } from 'lucide-react';

const ROLES = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "DevOps Engineer", "ML Engineer", "Product Manager",
  "UI/UX Designer", "Android Developer", "iOS Developer"
];

const EXPERIENCE_LEVELS = [
  "Fresher (0-1 years)", "Junior (1-3 years)", "Mid (3-5 years)", "Senior (5+ years)"
];

const LOADING_STEPS = [
  "Analyzing your resume...",
  "Identifying key skills...",
  "Generating questions...",
  "Almost ready!"
];

export default function NewSessionPage() {
  const router = useRouter();
  const [jobRole, setJobRole] = useState(ROLES[0]);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[0]);
  const [file, setFile] = useState<File | null>(null);
  
  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // File selection validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    setErrorMessage(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setValidationError("Only PDF files are supported.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setValidationError("File size must be under 5MB.");
      return;
    }
    setFile(selectedFile);
  };

  // Multi-step loading messages tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSubmitting && !errorMessage) {
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting, errorMessage]);

  // Polling for session completion
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (sessionId) {
      const pollStatus = async () => {
        try {
          const res = await sessionsApi.status(sessionId);
          if (res.status === 'ready') {
            clearInterval(pollInterval);
            router.push(`/sessions/${sessionId}`);
          } else if (res.status === 'failed') {
            clearInterval(pollInterval);
            setIsSubmitting(false);
            setErrorMessage(res.error_message || "Question generation failed. Your PDF might be malformed or scanned.");
          }
        } catch (error) {
          clearInterval(pollInterval);
          setIsSubmitting(false);
          setErrorMessage("Failed to check session creation status.");
        }
      };
      
      pollStatus(); // run once immediately
      pollInterval = setInterval(pollStatus, 2500);
    }

    return () => clearInterval(pollInterval);
  }, [sessionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setValidationError("Please select your PDF resume.");
      return;
    }
    
    setValidationError(null);
    setErrorMessage(null);
    setIsSubmitting(true);
    setCurrentStepIndex(0);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_role', jobRole);
    formData.append('experience_level', experienceLevel);

    try {
      const session = await sessionsApi.create(formData);
      setSessionId(session.id);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.response?.data?.detail || "An error occurred uploading your resume. Please try again.");
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-[var(--background)] px-6">
        <div className="text-center space-y-6 max-w-md w-full animate-fade-in">
          <div className="inline-flex p-5 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-3xl mb-4 animate-bounce">
            <Cpu className="w-8 h-8" strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-white transition-all duration-300">
            {LOADING_STEPS[currentStepIndex]}
          </h2>
          
          <p className="text-zinc-500 text-xs leading-relaxed font-medium">
            Please keep this page open. We are analyzing key skills from your resume using OpenRouter Llama-3.1 to generate highly relevant interview questions.
          </p>

          <div className="w-full bg-[#0c0c0e] h-1 rounded-full overflow-hidden border border-white/[0.04] mt-6">
            <div 
              className="bg-violet-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--background)]">
      <Header />

      <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 max-w-2xl w-full mx-auto animate-fade-in">
        <div className="text-center mb-8 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Configure Prep Session
          </h1>
          <p className="text-zinc-500 text-xs font-medium">
            Upload your text-based PDF resume, specify your target job role and experience level.
          </p>
        </div>

        <div className="premium-card p-8 w-full">
          {(validationError || errorMessage) && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span>{validationError || errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Job Role Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Target Job Role</label>
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="focus-ring-premium block w-full py-3 px-4 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Experience Level Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="focus-ring-premium block w-full py-3 px-4 bg-[#0c0c0e] border border-white/[0.06] rounded-xl text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  {EXPERIENCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop PDF upload area */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Upload Resume (PDF only, max 5MB)</label>
              <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border border-dashed border-white/[0.08] rounded-2xl hover:border-white/20 transition-colors relative bg-[#0c0c0e]/30">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-3 text-center pointer-events-none">
                  <div className="inline-flex p-3 bg-zinc-900 border border-white/[0.04] rounded-xl text-zinc-400 mb-1">
                    <Upload className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                        <FileText className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
                        {file.name}
                      </p>
                      <p className="text-zinc-500 text-[10px] font-bold">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-zinc-300 text-xs font-bold uppercase tracking-wider">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-zinc-500 text-[10px] font-medium">PDF formats only, text-based</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-4 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-violet-500/10 cursor-pointer hover:-translate-y-0.5 active:scale-95"
            >
              Analyze Resume & Generate Practice Bank
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
