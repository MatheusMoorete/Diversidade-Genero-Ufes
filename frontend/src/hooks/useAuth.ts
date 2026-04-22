/**
 * Hook e store Zustand para gerenciamento de autenticação.
 * Armazena token JWT e informações do usuário logado.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest } from '@/types';
import { authService } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  showLoginModal: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
}

/**
 * Store Zustand para autenticação com persistência no localStorage
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      showLoginModal: false,

      /**
       * Realiza login e armazena token
       */
      login: async (credentials: LoginRequest) => {
        try {
          const response = await authService.login(credentials);
          
          // Armazena token no localStorage
          localStorage.setItem('access_token', response.access_token);
          const user = await authService.getCurrentUser();

          set({
            user,
            token: response.access_token,
            isAuthenticated: true,
            showLoginModal: false, // Fecha o modal após login bem-sucedido
          });
        } catch (error) {
          throw error;
        }
      },

      refreshUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }

        const user = await authService.getCurrentUser();
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      /**
       * Realiza logout e limpa dados
       */
      logout: () => {
        localStorage.removeItem('access_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          showLoginModal: false,
        });
      },

      /**
       * Define informações do usuário
       */
      setUser: (user: User) => {
        set({ user });
      },

      /**
       * Abre o modal de login
       * Também limpa o estado de autenticação quando chamado por erro 401
       */
      openLoginModal: () => {
        set({
          showLoginModal: true,
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      /**
       * Fecha o modal de login
       */
      closeLoginModal: () => {
        set({ showLoginModal: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Não persiste showLoginModal no localStorage
      }),
    }
  )
);
