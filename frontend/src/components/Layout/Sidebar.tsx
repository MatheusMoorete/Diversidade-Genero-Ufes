/**
 * Componente de sidebar com menu de navegação.
 * Design moderno e criativo com animações suaves.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface MenuItem {
  path: string;
  label: string;
  icon: (isActive: boolean) => React.ReactNode;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const baseMenuItems: MenuItem[] = [
  {
    path: '/form',
    label: 'Formulário',
    icon: (isActive) => (
      <svg
        className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    path: '/patients',
    label: 'Pacientes',
    icon: (isActive) => (
      <svg
        className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    path: '/returns',
    label: 'Retornos',
    icon: (isActive) => (
      <svg
        className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    path: '/export',
    label: 'Exportar',
    icon: (isActive) => (
      <svg
        className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110 rotate-12' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const menuItems = user?.is_form_admin
    ? [
      ...baseMenuItems,
      {
        path: '/backup-health',
        label: 'Segurança',
        icon: (isActive: boolean) => (
          <svg
            className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
          </svg>
        ),
      },
      {
        path: '/form-schema',
        label: 'Perguntas',
        icon: (isActive: boolean) => (
          <svg
            className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h5M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H9l-4 3V7a2 2 0 012-2z" />
          </svg>
        ),
      },
    ]
    : baseMenuItems;

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[90] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static
          top-0 left-0
          w-64 h-screen lg:h-full
          bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
          text-white
          flex flex-col
          z-[100]
          transform transition-transform duration-300 ease-in-out
          shadow-2xl lg:shadow-none
          overflow-x-hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header - Desktop only */}
        <div className="hidden lg:block p-6 border-b border-slate-700/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Gestão de Pacientes
            </h1>
            {user && (
              <p className="text-sm text-slate-400 mt-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                Olá, {user.username}
              </p>
            )}
          </div>
        </div>

        {/* Botão fechar (mobile only) */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700/50">
          <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Menu
          </h1>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-700/50 transition-all duration-200 active:scale-95"
            aria-label="Fechar menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-1.5">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path || (item.path === '/patients' && location.pathname.startsWith('/patient/'));
              return (
                <li key={item.path} className="overflow-hidden">
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`
                      group relative flex items-center space-x-3 px-4 py-3 rounded-md
                      transition-all duration-300 ease-out
                      overflow-hidden
                    ${isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Indicador lateral animado para item ativo */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50 animate-pulse" />
                    )}

                    {/* Ícone com animação */}
                    <div className={`
                      transition-transform duration-300
                      ${isActive ? 'scale-110' : 'group-hover:scale-110'}
                    `}>
                      {item.icon(isActive)}
                    </div>

                    {/* Label com efeito */}
                    <span className={`
                      font-medium transition-all duration-300
                      ${isActive ? 'font-semibold' : ''}
                    `}>
                      {item.label}
                    </span>

                    {/* Efeito de brilho no hover - limitado ao container */}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="
              w-full flex items-center justify-center space-x-3 px-4 py-3 
              rounded-md text-slate-300 
              hover:text-white hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-500/20
              border border-slate-700/50 hover:border-red-500/50
              transition-all duration-300
              active:scale-[0.98]
              group
              overflow-hidden
            "
          >
            <svg
              className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};
