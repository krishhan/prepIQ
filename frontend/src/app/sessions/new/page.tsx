'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from 'src/components/Header';
import { sessionsApi } from 'src/lib/api';
import { Terminal, Upload, AlertCircle, FileText, Cpu } from 'lucide-react';

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
      <div className="flex-1 flex flex-col justify-center items-center bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="pulse-ring inline-flex p-5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl mb-4">
            <Cpu className="w-8 h-8 animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 transition-all duration-300">
            {LOADING_STEPS[currentStepIndex]}
          </h2>
          
          <p className="text-zinc-500 text-sm">
            Please keep this page open. We are analyzing key skills from your resume using OpenRouter Llama-3.1 to generate highly relevant interview questions.
          </p>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950">
      <Header />

      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 max-w-2xl w-full mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
            Configure Your Prep Session
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            Upload your text-based PDF resume, specify your target job role and experience level.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl w-full border border-zinc-800">
          {(validationError || errorMessage) && (
            <div className="flex items-center gap-3 p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{validationError || errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Job Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Target Job Role</label>
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  className="block w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm cursor-pointer"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Experience Level Selection */}
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="block w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors text-sm cursor-pointer"
                >
                  {EXPERIENCE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop PDF upload area */}
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2">Upload Resume (PDF only, max 5MB)</label>
              <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-zinc-800 border-dashed rounded-3xl hover:border-zinc-700 transition-colors relative bg-zinc-900/30">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 text-center pointer-events-none">
                  <div className="inline-flex p-3 bg-zinc-800 rounded-2xl text-zinc-400 mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  
                  {file ? (
                    <div className="flex flex-col items-center">
                      <p className="text-zinc-200 text-sm font-semibold flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        {file.name}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-zinc-300 text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-zinc-500 text-xs">PDF formats only, text-based</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md hover:shadow-indigo-500/10 cursor-pointer"
            >
              Analyze Resume & Generate Practice Bank
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
