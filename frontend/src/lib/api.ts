import axios from 'axios';
import {
  User,
  ResumeSession,
  InterviewQuestion,
  PracticeAttempt,
  MockInterview,
  MockAnswer,
  ConfidenceLevel
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ---- Token storage helpers ----
const ACCESS_TOKEN_KEY = 'prepiq_access';
const REFRESH_TOKEN_KEY = 'prepiq_refresh';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Still send cookies for backwards compat
});

// Request Interceptor: Attach Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Automatically handles token refreshes on 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/api/auth/login/') &&
      !originalRequest.url.includes('/api/auth/refresh/') &&
      !originalRequest.url.includes('/api/auth/signup/')
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        const res = await axios.post(
          `${API_URL}/api/auth/refresh/`,
          {},
          {
            withCredentials: true,
            headers: refreshToken ? { 'Authorization': `Bearer ${refreshToken}` } : {},
          }
        );
        // Store the new access token from the response body
        if (res.data?.access_token) {
          const currentRefresh = getRefreshToken();
          storeTokens(res.data.access_token, currentRefresh || '');
          originalRequest.headers['Authorization'] = `Bearer ${res.data.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path !== '/login' && path !== '/signup') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const authApi = {
  getCsrf: async () => {
    // No-op for Bearer token auth; kept for API compatibility
    return null;
  },

  signup: async (data: any): Promise<User> => {
    const response = await api.post('/api/auth/signup/', data);
    const { access_token, refresh_token, ...user } = response.data;
    if (access_token && refresh_token) {
      storeTokens(access_token, refresh_token);
    }
    return user as User;
  },

  login: async (data: any): Promise<User> => {
    const response = await api.post('/api/auth/login/', data);
    const { access_token, refresh_token, ...user } = response.data;
    if (access_token && refresh_token) {
      storeTokens(access_token, refresh_token);
    }
    return user as User;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout/');
    clearTokens();
  },

  me: async (): Promise<User> => {
    const response = await api.get('/api/auth/me/');
    return response.data;
  }
};

export const sessionsApi = {
  create: async (formData: FormData): Promise<ResumeSession> => {
    const response = await api.post('/api/sessions/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  list: async (): Promise<ResumeSession[]> => {
    const response = await api.get('/api/sessions/');
    return response.data;
  },

  detail: async (id: number): Promise<ResumeSession> => {
    const response = await api.get(`/api/sessions/${id}/`);
    return response.data;
  },

  status: async (id: number): Promise<{ status: string; error_message?: string }> => {
    const response = await api.get(`/api/sessions/${id}/status/`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/sessions/${id}/`);
  },

  questions: async (sessionId: number, filters?: { category?: string; difficulty?: string }): Promise<InterviewQuestion[]> => {
    const response = await api.get(`/api/sessions/${sessionId}/questions/`, { params: filters });
    return response.data;
  }
};

export const questionsApi = {
  updateConfidence: async (questionId: number, level: ConfidenceLevel): Promise<any> => {
    const response = await api.patch(`/api/questions/${questionId}/confidence/`, { level });
    return response.data;
  },

  practice: async (questionId: number, userAnswer: string): Promise<PracticeAttempt> => {
    const response = await api.post(`/api/questions/${questionId}/practice/`, { user_answer: userAnswer });
    return response.data;
  },

  attempts: async (questionId: number): Promise<PracticeAttempt[]> => {
    const response = await api.get(`/api/questions/${questionId}/attempts/`);
    return response.data;
  }
};

export const mockApi = {
  setup: async (sessionId: number, data: { question_count: number; question_mix: string; time_limit: number | null }): Promise<{ mock: MockInterview; questions: InterviewQuestion[] }> => {
    const response = await api.post(`/api/sessions/${sessionId}/mock/`, data);
    return response.data;
  },

  detail: async (id: number): Promise<{ mock: MockInterview; questions: InterviewQuestion[] }> => {
    const response = await api.get(`/api/mock/${id}/`);
    return response.data;
  },

  submitAnswer: async (id: number, questionId: number, userAnswer: string): Promise<MockAnswer> => {
    const response = await api.post(`/api/mock/${id}/answer/`, { question_id: questionId, user_answer: userAnswer });
    return response.data;
  },

  skipQuestion: async (id: number, questionId: number): Promise<MockAnswer> => {
    const response = await api.post(`/api/mock/${id}/skip/`, { question_id: questionId });
    return response.data;
  },

  complete: async (id: number): Promise<MockInterview> => {
    const response = await api.post(`/api/mock/${id}/complete/`);
    return response.data;
  },

  status: async (id: number): Promise<{ status: string; error_message?: string }> => {
    const response = await api.get(`/api/mock/${id}/status/`);
    return response.data;
  },

  report: async (id: number): Promise<{ mock: MockInterview; questions: InterviewQuestion[]; answers: MockAnswer[] }> => {
    const response = await api.get(`/api/mock/${id}/report/`);
    return response.data;
  },

  listBySession: async (sessionId: number): Promise<MockInterview[]> => {
    const response = await api.get(`/api/sessions/${sessionId}/mocks/`);
    return response.data;
  }
};
