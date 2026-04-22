/**
 * Componente principal da aplicação.
 * Configura rotas e layout geral.
 * Mobile first design com header elegante.
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

// Configuração do React Query com estratégia de cache inteligente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não refaz fetch automaticamente ao focar na janela (evita chamadas desnecessárias)
      refetchOnWindowFocus: false,
      // Não refaz fetch ao reconectar (para não sobrecarregar em conexões instáveis)
      refetchOnReconnect: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
      // Tempo padrão que os dados são considerados "fresh" (não fazem nova requisição)
      staleTime: 1000 * 60 * 2, // 2 minutos padrão
      // Tempo que os dados ficam em cache após não serem usados
      gcTime: 1000 * 60 * 5, // 5 minutos (antigo cacheTime)
    },
    mutations: {
      // Retry apenas 1 vez em caso de erro em mutations
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { isAuthenticated, showLoginModal, openLoginModal, closeLoginModal, refreshUser, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Configura o callback para abrir o modal quando houver erro 401
  useEffect(() => {
    setUnauthorizedCallback(() => {
      openLoginModal();
    });
  }, [openLoginModal]);

  useEffect(() => {
    if (!isAuthenticated) return;

    refreshUser().catch(() => {
      // O interceptor já trata 401; aqui evitamos quebrar a renderização.
    });
  }, [isAuthenticated, refreshUser]);

  return (
    <BrowserRouter>
      {/* Modal de login para erros 401 */}
      <LoginModal isOpen={showLoginModal} onClose={closeLoginModal} />

      {/* Sistema global de notificações */}
      <ToastContainer />

      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/form" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/form" /> : <Register />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
                  {/* Header mobile */}
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
