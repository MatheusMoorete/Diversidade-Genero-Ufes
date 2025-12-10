/**
 * Página de listagem de pacientes.
 * Permite buscar, ordenar e paginar a lista de pacientes.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { patientService } from '@/services/api';
import { queryKeys } from '@/config/queryKeys';
import type { Patient } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SortOrder = 'name' | 'created_at';

export const PatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce no searchTerm para evitar muitas requisições durante digitação
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Busca pacientes com paginação e ordenação (usa debouncedSearchTerm)
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: queryKeys.patients.list({ search: debouncedSearchTerm, orderBy: sortOrder, page: currentPage }),
    queryFn: () => {
      const skip = (currentPage - 1) * itemsPerPage;
      return patientService.searchPatients(debouncedSearchTerm || undefined, skip, itemsPerPage, sortOrder);
    },
    staleTime: 1000 * 60 * 2, // 2 minutos - dados de pacientes mudam ocasionalmente
    gcTime: 1000 * 60 * 5, // 5 minutos em cache
  });

  // Busca total de pacientes para calcular paginação
  // Estratégia otimizada:
  // - Se há busca: sempre precisa do count
  // - Se não há busca e temos menos que uma página completa: não precisa (totalPages = 1)
  // - Se não há busca e temos exatamente uma página completa: precisa saber se há mais (pode haver mais páginas)
  // - Se estamos em uma página > 1: precisa do count
  const hasSearch = debouncedSearchTerm.length > 0;
  const needsCount = hasSearch || 
                     (currentPage > 1) || 
                     (patients.length === itemsPerPage && currentPage === 1);
  
  const { data: allPatientsForCount = [] } = useQuery<Patient[]>({
    queryKey: queryKeys.patients.list({ search: debouncedSearchTerm, orderBy: sortOrder }),
    queryFn: () => patientService.searchPatients(debouncedSearchTerm || undefined, 0, 10000, sortOrder),
    enabled: needsCount, // Só busca count se necessário
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos em cache
  });

  // Calcula totalPages de forma otimizada
  const totalPages = React.useMemo(() => {
    // Se não há busca e temos menos que uma página completa, só há uma página
    if (!hasSearch && patients.length < itemsPerPage && currentPage === 1) {
      return 1;
    }
    // Caso contrário, usa o count da query (ou assume pelo menos 1 página se ainda não carregou)
    if (needsCount && allPatientsForCount.length > 0) {
      return Math.ceil(allPatientsForCount.length / itemsPerPage);
    }
    // Fallback: se temos exatamente uma página completa, assume que pode haver mais (mas mostra pelo menos 1)
    if (patients.length === itemsPerPage) {
      return currentPage + 1; // Pelo menos a página atual + 1 possível
    }
    return Math.max(1, currentPage); // Pelo menos a página atual
  }, [allPatientsForCount.length, patients.length, itemsPerPage, needsCount, hasSearch, currentPage]);

  const handleSelectPatient = (patient: Patient) => {
    navigate(`/patient/${patient.id}`);
  };

  const handleSortChange = (order: SortOrder) => {
    setSortOrder(order);
    setCurrentPage(1); // Volta para primeira página ao mudar ordenação
  };

  // Quando searchTerm muda (antes do debounce), reseta para página 1
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-6">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Pacientes
              </h1>
              <p className="text-gray-500 text-lg">
                Busque e acesse a ficha dos pacientes
              </p>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // currentPage será resetado no useEffect acima
                }}
                placeholder="Buscar paciente por nome..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 transition-all bg-white"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtros de Ordenação */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Ordenar por:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSortChange('name')}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${sortOrder === 'name'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Ordem Alfabética
                </button>
                <button
                  onClick={() => handleSortChange('created_at')}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                    ${sortOrder === 'created_at'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Data de Cadastro
                </button>
              </div>
            </div>
            {allPatientsForCount.length > 0 && (
              <span className="text-sm text-gray-500 hidden sm:inline">
                {allPatientsForCount.length} {allPatientsForCount.length === 1 ? 'paciente' : 'pacientes'}
              </span>
            )}
          </div>
        </div>

        {/* Lista de Pacientes */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando pacientes...</p>
          </div>
        ) : patients && patients.length > 0 ? (
          <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
              <div className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                          {patient.full_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {format(new Date(patient.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors ml-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }
                  `}
                >
                  Anterior
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`
                          px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                          ${currentPage === pageNum
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }
                  `}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'Nenhum paciente encontrado com esse nome.' : 'Nenhum paciente cadastrado ainda.'}
            </p>
            {!searchTerm && (
              <p className="text-gray-400 text-sm mt-2">Comece criando um novo formulário na página de Formulário.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

