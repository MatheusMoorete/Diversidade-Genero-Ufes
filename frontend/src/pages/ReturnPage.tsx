/**
 * Página de Retornos Agendados.
 * Mostra os próximos retornos dos próximos 15 dias de todos os pacientes.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { useNavigate } from 'react-router-dom';
import { patientService, formService } from '@/services/api';
import { format, parseISO, startOfDay, isBefore, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FormResponse, Patient } from '@/types';

interface ReturnWithPatient extends FormResponse {
  patient?: Patient;
}

export const ReturnPage: React.FC = () => {
  const navigate = useNavigate();

  // Busca todos os pacientes (para associar aos retornos)
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: queryKeys.patients.list({}),
    queryFn: () => patientService.searchPatients('', 0, 1000),
    staleTime: 1000 * 60 * 3, // 3 minutos - lista de pacientes muda ocasionalmente
    gcTime: 1000 * 60 * 5, // 5 minutos em cache
  });

  // Busca todos os retornos dos próximos 15 dias em uma única chamada
  const { data: allFormResponses = [], isLoading: isLoadingReturns } = useQuery({
    queryKey: queryKeys.formResponses.upcomingReturns(15),
    queryFn: () => formService.getUpcomingReturns(15),
    staleTime: 1000 * 60, // 1 minuto - retornos são mais dinâmicos
    gcTime: 1000 * 60 * 3, // 3 minutos em cache
  });

  // Filtra retornos dos próximos 15 dias e adiciona informações do paciente
  const upcomingReturns = useMemo(() => {
    const today = startOfDay(new Date());
    const fifteenDaysFromNow = addDays(today, 15);

    const returnsWithPatient: ReturnWithPatient[] = allFormResponses
      .map((response) => {
        const patient = patients.find((p) => p.id === response.patient_id);
        return { ...response, patient };
      })
    .filter((response) => {
      if (!response.next_return_date) return false;
        const returnDate = startOfDay(parseISO(response.next_return_date));
        const daysDiff = differenceInDays(returnDate, today);
        // Inclui retornos de hoje até 15 dias no futuro (0 a 15 dias)
        return daysDiff >= 0 && daysDiff <= 15;
    })
    .sort((a, b) => {
      if (!a.next_return_date || !b.next_return_date) return 0;
        const dateA = startOfDay(parseISO(a.next_return_date));
        const dateB = startOfDay(parseISO(b.next_return_date));
        return dateA.getTime() - dateB.getTime();
    });

    return returnsWithPatient;
  }, [allFormResponses, patients]);

  const today = startOfDay(new Date());
  const isLoading = isLoadingPatients || isLoadingReturns;

  // Agrupa retornos por data
  const returnsByDate = useMemo(() => {
    const grouped: Record<string, ReturnWithPatient[]> = {};

    upcomingReturns.forEach((returnItem) => {
      if (!returnItem.next_return_date) return;
      const returnDate = startOfDay(parseISO(returnItem.next_return_date));
      const dateKey = format(returnDate, 'yyyy-MM-dd');

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(returnItem);
    });

    return grouped;
  }, [upcomingReturns]);

  const sortedDates = useMemo(() => {
    return Object.keys(returnsByDate).sort();
  }, [returnsByDate]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-6">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Retornos Agendados
              </h1>
              <p className="text-gray-500 text-lg">
                Próximos retornos dos próximos 15 dias
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Retornos */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#55CDFC] mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando retornos...</p>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">Nenhum retorno agendado para os próximos 15 dias</p>
                </div>
              ) : (
            sortedDates.map((dateKey) => {
              const returns = returnsByDate[dateKey];
              const returnDate = startOfDay(parseISO(dateKey));
              const daysFromToday = differenceInDays(returnDate, today);
              const isTodayReturn = daysFromToday === 0;
              const isTomorrow = daysFromToday === 1;

              return (
                <div key={dateKey} className="space-y-4">
                  {/* Cabeçalho da Data */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 border-t border-gray-200"></div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {isTodayReturn
                          ? 'Hoje'
                          : isTomorrow
                            ? 'Amanhã'
                            : format(returnDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({format(returnDate, "dd/MM/yyyy", { locale: ptBR })})
                      </span>
                      {isTodayReturn && (
                        <span className="px-2 py-1 bg-[#55CDFC] text-white text-xs font-medium rounded-full">
                          Hoje
                        </span>
                      )}
                    </div>
                    <div className="flex-1 border-t border-gray-200"></div>
                  </div>

                  {/* Cards de Retornos */}
                  <div className="space-y-3">
                    {returns.map((returnItem) => {
                      const daysUntilReturn = differenceInDays(returnDate, today);

                    return (
                      <div
                          key={returnItem.id}
                        className={`
                            bg-white rounded-xl shadow-sm border-2 p-6
                            hover:shadow-md transition-all cursor-pointer
                            ${isTodayReturn
                              ? 'border-[#55CDFC] bg-gradient-to-r from-[#55CDFC]/5 to-transparent'
                              : daysUntilReturn <= 3
                                ? 'border-yellow-300 bg-yellow-50/30'
                                : 'border-gray-200'
                          }
                        `}
                          onClick={() => navigate(`/patient/${returnItem.patient_id}`)}
                      >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {returnItem.patient?.full_name || 'Paciente não encontrado'}
                              </h3>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <p>
                                  Última consulta:{' '}
                                  {format(parseISO(returnItem.response_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </p>
                                {returnItem.uses_hormone_over_1year && (
                                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                Usa hormônio há mais de 1 ano
                              </span>
                            )}
                          </div>
                              {daysUntilReturn > 0 && (
                                <p className="text-sm text-gray-500">
                                  Em {daysUntilReturn} {daysUntilReturn === 1 ? 'dia' : 'dias'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                            {isTodayReturn && (
                                <span className="px-3 py-1 bg-[#55CDFC] text-white text-sm font-medium rounded-lg">
                                Hoje
                              </span>
                            )}
                              {daysUntilReturn <= 3 && daysUntilReturn > 0 && (
                                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-sm font-medium rounded-lg">
                                  Em breve
                                </span>
                              )}
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

