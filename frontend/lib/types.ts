export interface User {
  id: number;
  email: string;
  name: string;
  total_sessions: number;
  total_mocks: number;
  avg_mock_score: number;
  best_mock_score: number;
}

export type SessionStatus = 'processing' | 'ready' | 'failed';
export type MockInterviewStatus = 'in_progress' | 'completed' | 'abandoned' | 'failed';
export type HiringRecommendation = 'Strong Yes' | 'Yes' | 'Maybe' | 'No';
export type QuestionCategory = 'Technical' | 'Project-Based' | 'Behavioral' | 'Role-Specific';
export type ConfidenceLevel = 'not_practiced' | 'needs_work' | 'confident';
export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface ResumeSession {
  id: number;
  resume_filename: string;
  resume_text?: string;
  job_role: string;
  experience_level: string;
  status: SessionStatus;
  error_message?: string;
  created_at: string;
  question_count: number;
  best_mock_score: number;
}

export interface InterviewQuestion {
  id: number;
  category: QuestionCategory;
  question_text: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  why_asked: string;
  ideal_answer_outline: string[];
  order_index: number;
  // confidence is loaded dynamically for user
  confidence?: ConfidenceLevel;
}

export interface QuestionConfidence {
  id: number;
  question: number;
  level: ConfidenceLevel;
  updated_at: string;
}

export interface PracticeAttempt {
  id: number;
  question: number;
  user_answer: string;
  score: number;
  ai_feedback: {
    score: number;
    strengths: string[];
    missed_points: string[];
    communication_quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    improved_answer: string;
  };
  created_at: string;
}

export interface MockAnswer {
  id: number;
  mock_interview: number;
  question: number;
  user_answer: string;
  was_skipped: boolean;
  was_timed_out: boolean;
  time_taken_seconds: number;
  per_question_score?: number;
  per_question_feedback?: {
    score: number;
    strengths: string[];
    missed_points: string[];
    communication_quality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    improved_answer: string;
  };
  submitted_at: string;
}

export interface CategoryScores {
  technical_knowledge: number;
  project_understanding: number;
  behavioral: number;
  communication: number;
  problem_solving: number;
}

export interface RoadmapItem {
  area: string;
  suggestion: string;
  priority: PriorityLevel;
}

export interface MockReport {
  overall_score: number;
  hiring_recommendation: HiringRecommendation;
  overall_summary: string;
  category_scores: CategoryScores;
  top_strengths: string[];
  critical_gaps: string[];
  improvement_roadmap: RoadmapItem[];
  best_answer: {
    question: string;
    reason: string;
  };
  weakest_answer: {
    question: string;
    reason: string;
  };
  interview_tips: string[];
}

export interface MockInterview {
  id: number;
  session: number;
  question_count: number;
  question_mix: 'balanced' | 'technical' | 'behavioral';
  time_limit_per_question: number | null;
  status: MockInterviewStatus;
  error_message?: string;
  question_order: number[];
  current_question_index: number;
  overall_score?: number;
  hiring_recommendation?: HiringRecommendation;
  full_report?: MockReport;
  started_at: string;
  completed_at?: string;
}
