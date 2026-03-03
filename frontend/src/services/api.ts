import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage helpers
const TOKEN_KEY = 'auth_token';

export const getStoredToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const setStoredToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

export const removeStoredToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// Add auth interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  googleAuth: async (sessionId: string) => {
    const response = await api.post('/auth/google', { session_id: sessionId });
    return response.data;
  },
  appleAuth: async (identityToken: string, user: string, email?: string, fullName?: any) => {
    const response = await api.post('/auth/apple', {
      identity_token: identityToken,
      user,
      email,
      full_name: fullName,
    });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Jobs APIs
export const jobsApi = {
  getAll: async () => {
    const response = await api.get('/jobs');
    return response.data;
  },
  create: async (job: any) => {
    const response = await api.post('/jobs', job);
    return response.data;
  },
  update: async (jobId: string, job: any) => {
    const response = await api.put(`/jobs/${jobId}`, job);
    return response.data;
  },
  delete: async (jobId: string) => {
    const response = await api.delete(`/jobs/${jobId}`);
    return response.data;
  },
};

// Work Entries APIs
export const workEntriesApi = {
  getAll: async (month?: string, jobId?: string) => {
    const params: any = {};
    if (month) params.month = month;
    if (jobId) params.job_id = jobId;
    const response = await api.get('/work-entries', { params });
    return response.data;
  },
  create: async (entry: any) => {
    const response = await api.post('/work-entries', entry);
    return response.data;
  },
  close: async (entryId: string, endTime: string, isNextDay: boolean) => {
    const response = await api.put(`/work-entries/${entryId}/close`, {
      end_time: endTime,
      is_next_day: isNextDay,
    });
    return response.data;
  },
  delete: async (entryId: string) => {
    const response = await api.delete(`/work-entries/${entryId}`);
    return response.data;
  },
};

// Expenses APIs
export const expensesApi = {
  getAll: async (month?: string) => {
    const params: any = {};
    if (month) params.month = month;
    const response = await api.get('/expenses', { params });
    return response.data;
  },
  create: async (expense: any) => {
    const response = await api.post('/expenses', expense);
    return response.data;
  },
  delete: async (expenseId: string) => {
    const response = await api.delete(`/expenses/${expenseId}`);
    return response.data;
  },
};

// Dashboard APIs
export const dashboardApi = {
  getSummary: async (month?: string) => {
    const params: any = {};
    if (month) params.month = month;
    const response = await api.get('/dashboard/summary', { params });
    return response.data;
  },
  getWeeklyChart: async (weeks: number = 4) => {
    const response = await api.get('/dashboard/weekly-chart', { params: { weeks } });
    return response.data;
  },
  getHistory: async (limit: number = 20) => {
    const response = await api.get('/dashboard/history', { params: { limit } });
    return response.data;
  },
};

// Push Tokens APIs
export const pushTokensApi = {
  register: async (pushToken: string, platform: string, deviceId?: string) => {
    const response = await api.post('/push-tokens/register', {
      push_token: pushToken,
      platform,
      device_id: deviceId,
    });
    return response.data;
  },
  unregister: async (pushToken: string) => {
    const response = await api.delete('/push-tokens/unregister', {
      params: { push_token: pushToken },
    });
    return response.data;
  },
};

export default api;
