/**
 * Componente principal da aplicacao.
 * Configura rotas, layout geral e bootstrap silencioso da sessao.
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '@/components/Layout/Sidebar';
import { Header } from '@/components/Layout/Header';
import { ProtectedRoute } from '@/components/Layout/ProtectedRoute';
import { LoginModal } from '@/components/Layout/LoginModal';
import { ToastContainer } from '@/components/shared/ToastContainer';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { FormPage } from '@/pages/FormPage';
import { ReturnPage } from '@/pages/ReturnPage';
import { ExportPage } from '@/pages/ExportPage';
import { BackupHealthPage } from '@/pages/BackupHealthPage';
import { FormSchemaPage } from '@/pages/FormSchemaPage';
import PatientProfilePage from '@/pages/PatientProfilePage';
import { PatientsPage } from '@/pages/PatientsPage';
import { useAuth } from '@/hooks/useAuth';
import { setUnauthorizedCallback } from '@/services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
    },
    mutations: {
      retry: 1,
    },
  },
});

const SessionLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A6FA5] mx-auto mb-4" />
      <p className="text-gray-600">Verificando sessao...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    isSessionLoading,
    showLoginModal,
    openLoginModal,
    closeLoginModal,
    checkSession,
    user,
  } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setUnauthorizedCallback(() => {
      openLoginModal();
    });
  }, [openLoginModal]);

  useEffect(() => {
    checkSession().catch(() => {
      // A checagem inicial silenciosa nao deve quebrar a renderizacao.
    });
  }, [checkSession]);

  return (
    <BrowserRouter>
      <LoginModal isOpen={showLoginModal} onClose={closeLoginModal} />
      <ToastContainer />

      <Routes>
        <Route
          path="/login"
          element={isSessionLoading ? <SessionLoadingScreen /> : isAuthenticated ? <Navigate to="/form" /> : <Login />}
        />
        <Route
          path="/register"
          element={isSessionLoading ? <SessionLoadingScreen /> : isAuthenticated ? <Navigate to="/form" /> : <Register />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
                  <Header onMenuClick={() => setSidebarOpen(true)} />
                  <div className="lg:pt-0 pt-16">
                    <Routes>
                      <Route path="/form" element={<FormPage />} />
                      <Route path="/patients" element={<PatientsPage />} />
                      <Route path="/returns" element={<ReturnPage />} />
                      <Route path="/export" element={<ExportPage />} />
                      <Route
                        path="/backup-health"
                        element={user?.is_form_admin ? <BackupHealthPage /> : <Navigate to="/form" replace />}
                      />
                      <Route
                        path="/form-schema"
                        element={user?.is_form_admin ? <FormSchemaPage /> : <Navigate to="/form" replace />}
                      />
                      <Route path="/patient/:id" element={<PatientProfilePage />} />
                      <Route path="/" element={<Navigate to="/form" replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
