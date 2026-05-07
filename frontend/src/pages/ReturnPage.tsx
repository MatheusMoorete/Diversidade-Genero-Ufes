/**
 * Pagina de Retornos Agendados.
 * Mostra os proximos retornos por janela de 4, 12 ou 24 semanas.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { useNavigate } from 'react-router-dom';
import { patientService, formService } from '@/services/api';
import { differenceInCalendarWeeks, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FormResponse, Patient } from '@/types';
import {
  formatReturnWeekRange,
  getRelativeReturnWeekLabel,
  getReturnWindowDaysFromWeeks,
  getReturnWeekKey,
  getReturnWeekStart,
  parseReturnDate,
} from '@/utils/returnWeeks';

interface ReturnWithPatient extends FormResponse {
  patient?: Patient;
}

export const ReturnPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterWeeks, setFilterWeeks] = React.useState<4 | 12 | 24>(24);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterWeeks]);

  const returnWindowDays = useMemo(() => getReturnWindowDaysFromWeeks(filterWeeks), [filterWeeks]);

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: queryKeys.patients.list({}),
    queryFn: () => patientService.searchPatients('', 0, 1000),
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 5,
  });

  const { data: allFormResponses = [], isLoading: isLoadingReturns } = useQuery({
    queryKey: queryKeys.formResponses.upcomingReturns(returnWindowDays),
    queryFn: () => formService.getUpcomingReturns(returnWindowDays),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 3,
  });

  const upcomingReturns = useMemo(() => {
    const returnsWithPatient: ReturnWithPatient[] = allFormResponses
      .map((response) => {
        const patient = patients.find((item) => item.id === response.patient_id);
        return { ...response, patient };
      })
      .sort((a, b) => {
        if (!a.next_return_date || !b.next_return_date) return 0;
        const dateA = parseReturnDate(a.next_return_date);
        const dateB = parseReturnDate(b.next_return_date);
        return dateA.getTime() - dateB.getTime();
      });

    return returnsWithPatient;
  }, [allFormResponses, patients]);

  const currentWeek = getReturnWeekStart(new Date());
  const isLoading = isLoadingPatients || isLoadingReturns;

  const returnsByWeek = useMemo(() => {
    const grouped: Record<string, ReturnWithPatient[]> = {};

    upcomingReturns.forEach((returnItem) => {
      if (!returnItem.next_return_date) return;
      const weekKey = getReturnWeekKey(returnItem.next_return_date);

      if (!grouped[weekKey]) {
        grouped[weekKey] = [];
      }
      grouped[weekKey].push(returnItem);
    });

    return grouped;
  }, [upcomingReturns]);

  const sortedWeeks = useMemo(() => {
    return Object.keys(returnsByWeek).sort();
  }, [returnsByWeek]);

  const totalItems = sortedWeeks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const currentWeeks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedWeeks.slice(start, start + itemsPerPage);
  }, [sortedWeeks, currentPage]);

  const formatFilterLabel = (weeks: number) => {
    return `${weeks} semanas`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                <span className="hidden md:inline">Retornos Agendados</span>
                <span className="md:hidden">Retornos</span>
              </h1>
              <p className="text-gray-500 text-lg">
                Proximos retornos das proximas {formatFilterLabel(filterWeeks)}
              </p>
            </div>

            <div className="flex bg-gray-200/50 p-1 rounded-xl shadow-inner-sm w-full md:w-auto">
              {[4, 12, 24].map((weeks) => (
                <button
                  key={weeks}
                  onClick={() => setFilterWeeks(weeks as 4 | 12 | 24)}
                  className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    filterWeeks === weeks
                      ? 'bg-white text-[#4A6FA5] shadow-md transform scale-[1.02]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {weeks} Semanas
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6FA5] mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando retornos...</p>
            </div>
          ) : sortedWeeks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">
                Nenhum retorno agendado para as proximas {formatFilterLabel(filterWeeks)}
              </p>
            </div>
          ) : (
            <>
              {currentWeeks.map((weekKey) => {
                const returns = returnsByWeek[weekKey];
                const weekStart = getReturnWeekStart(weekKey);
                const weeksFromCurrent = differenceInCalendarWeeks(weekStart, currentWeek, {
                  weekStartsOn: 1,
                });
                const isCurrentWeek = weeksFromCurrent === 0;
                const isNextWeek = weeksFromCurrent === 1;

                return (
                  <div key={weekKey} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 border-t border-gray-200"></div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-semibold text-gray-900 capitalize">
                          {isCurrentWeek
                            ? 'Nesta semana'
                            : isNextWeek
                              ? 'Proxima semana'
                              : `Semana de ${format(weekStart, 'dd/MM/yyyy', { locale: ptBR })}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({formatReturnWeekRange(weekKey)})
                        </span>
                        {isCurrentWeek && (
                          <span className="px-2 py-1 bg-[#4A6FA5] text-white text-xs font-medium rounded-full">
                            Esta semana
                          </span>
                        )}
                      </div>
                      <div className="flex-1 border-t border-gray-200"></div>
                    </div>

                    <div className="space-y-3">
                      {returns.map((returnItem) => {
                        const relativeWeekLabel = returnItem.next_return_date
                          ? getRelativeReturnWeekLabel(returnItem.next_return_date)
                          : '';

                        return (
                          <div
                            key={returnItem.id}
                            className={`
                              bg-white rounded-xl shadow-sm border-2 p-6
                              hover:shadow-md transition-all cursor-pointer
                              ${
                                isCurrentWeek
                                  ? 'border-[#4A6FA5] bg-gradient-to-r from-[#4A6FA5]/5 to-transparent'
                                  : isNextWeek
                                    ? 'border-yellow-300 bg-yellow-50/30'
                                    : 'border-gray-200'
                              }
                            `}
                            onClick={() => navigate(`/patient/${returnItem.patient_id}`)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                  {returnItem.patient?.full_name || 'Paciente nao encontrado'}
                                </h3>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                  <p>
                                    Ultima consulta:{' '}
                                    {format(parseISO(returnItem.response_date), 'dd/MM/yyyy', {
                                      locale: ptBR,
                                    })}
                                  </p>
                                  {returnItem.uses_hormone_over_1year && (
                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                      Usa hormonio ha mais de 1 ano
                                    </span>
                                  )}
                                </div>
                                {relativeWeekLabel && (
                                  <p className="text-sm text-gray-500">
                                    {relativeWeekLabel}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {isCurrentWeek && (
                                  <span className="px-3 py-1 bg-[#4A6FA5] text-white text-sm font-medium rounded-lg">
                                    Esta semana
                                  </span>
                                )}
                                {isNextWeek && (
                                  <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-sm font-medium rounded-lg">
                                    Proxima semana
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
              })}

              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        currentPage === 1
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
                          onClick={() => setCurrentPage(pageNum as number)}
                          className={`
                            px-3 py-2 text-sm font-medium rounded-md transition-colors
                            ${
                              currentPage === pageNum
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
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                      }
                    `}
                  >
                    Proxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
