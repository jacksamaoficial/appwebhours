import { create } from 'zustand';
import { User } from '../types';
import { authApi, setStoredToken, removeStoredToken, getStoredToken } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (sessionId: string) => Promise<void>;
  loginWithApple: (identityToken: string, user: string, email?: string, fullName?: any) => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authApi.login(email, password);
      await setStoredToken(data.access_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Error al iniciar sesión',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authApi.register(email, password, name);
      await setStoredToken(data.access_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Error al registrarse',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithGoogle: async (sessionId: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authApi.googleAuth(sessionId);
      await setStoredToken(data.access_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Error con Google',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithApple: async (identityToken: string, user: string, email?: string, fullName?: any) => {
    try {
      set({ isLoading: true, error: null });
      const data = await authApi.appleAuth(identityToken, user, email, fullName);
      await setStoredToken(data.access_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Error con Apple',
        isLoading: false,
      });
      throw error;
    }
  },

  checkAuth: async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      await removeStoredToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    await removeStoredToken();
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
