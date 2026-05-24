import { create } from 'zustand';
import type { User } from '../types';
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      // Try to refresh the access token using the httpOnly cookie
      const { data } = await import('../api/client').then(({ apiClient }) =>
        apiClient.post<{ access_token: string }>('/auth/refresh', {}),
      );
      const { setAccessToken } = await import('../api/client');
      setAccessToken(data.access_token);

      const user = await getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (data) => {
    await apiLogin(data);
    const user = await getMe();
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    await apiRegister(data);
    const user = await getMe();
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, isAuthenticated: false });
  },
}));
