/**
 * Store de autenticacao usando sessao em cookie HttpOnly.
 *
 * O estado de login nao e persistido no browser. A fonte de verdade e sempre
 * o cookie HttpOnly validado pelo backend em /api/auth/me.
 */

import { create } from 'zustand';

import type { LoginRequest, User } from '@/types';
import { authService } from '@/services/api';

const clearLegacyAuthStorage = () => {
  try {
    localStorage.removeItem('auth-storage');
  } catch {
    // Ignora ambientes sem localStorage disponivel.
  }
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  showLoginModal: boolean;
  checkSession: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isSessionLoading: true,
  showLoginModal: false,

  checkSession: async () => {
    clearLegacyAuthStorage();
    set({ isSessionLoading: true });

    try {
      const user = await authService.getCurrentUser({ skipUnauthorizedHandler: true });
      set({
        user,
        isAuthenticated: true,
        isSessionLoading: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isSessionLoading: false,
        showLoginModal: false,
      });
    }
  },

  login: async (credentials: LoginRequest) => {
    await authService.login(credentials);
    const user = await authService.getCurrentUser();

    set({
      user,
      isAuthenticated: true,
      isSessionLoading: false,
      showLoginModal: false,
    });
  },

  refreshUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isSessionLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isSessionLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // A sessao local deve ser limpa mesmo se o backend ja tiver expirado o cookie.
    }

    set({
      user: null,
      isAuthenticated: false,
      isSessionLoading: false,
      showLoginModal: false,
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  openLoginModal: () => {
    set({
      showLoginModal: true,
      user: null,
      isAuthenticated: false,
      isSessionLoading: false,
    });
  },

  closeLoginModal: () => {
    set({ showLoginModal: false });
  },
}));
