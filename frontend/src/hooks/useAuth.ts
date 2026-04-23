/**
 * Store de autenticacao usando sessao em cookie HttpOnly.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LoginRequest, User } from '@/types';
import { authService } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  showLoginModal: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      showLoginModal: false,

      login: async (credentials: LoginRequest) => {
        await authService.login(credentials);
        const user = await authService.getCurrentUser();

        set({
          user,
          isAuthenticated: true,
          showLoginModal: false,
        });
      },

      refreshUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          set({
            user,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
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
        });
      },

      closeLoginModal: () => {
        set({ showLoginModal: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
