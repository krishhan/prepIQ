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

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Crucial for cookie-based JWT sharing
});

let cachedCsrfToken: string | null = null;

// Fetches a fresh CSRF token and sets the csrftoken cookie in the browser
export const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const response = await axios.get(`${API_URL}/api/auth/csrf/`, { withCredentials: true });
    cachedCsrfToken = response.data.csrfToken;
    return cachedCsrfToken;
  } catch (error) {
    console.error("Failed to fetch CSRF token", error);
    return null;
  }
};

// Request Interceptor: Automatically attaches X-CSRFToken header to mutating requests
api.interceptors.request.use(
  async (config) => {
    const method = config.method ? config.method.toLowerCase() : '';
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      if (!cachedCsrfToken) {
        await fetchCsrfToken();
      }
      if (cachedCsrfToken) {
        config.headers['X-CSRFToken'] = cachedCsrfToken;
      }
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
    
    // If we receive a 401 and it's not a login/refresh request, try to refresh
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
        // Call refresh endpoint to rotate cookies in backend
        await axios.post(`${API_URL}/api/auth/refresh/`, {}, { withCredentials: true });
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, user session is dead, propagate logout or redirect
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const authApi = {
  getCsrf: () => fetchCsrfToken(),
  
  signup: async (data: any): Promise<User> => {
    const response = await api.post('/api/auth/signup/', data);
    return response.data;
  },
  
  login: async (data: any): Promise<User> => {
    const response = await api.post('/api/auth/login/', data);
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout/');
  },
  
  me: async (): Promise<User> => {
    const response = await api.get('/api/auth/me/');
    return response.data;
  }
};

export const sessionsApi = {
  create: async (formData: FormData): Promise<ResumeSession> => {
    // Send form-data (PDF upload + role/level)
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
