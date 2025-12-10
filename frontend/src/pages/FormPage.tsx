/**
 * Página 1: Formulário de cadastro de pacientes e respostas.
 * Design moderno estilo Google Forms com formulário dinâmico baseado em JSON.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { SearchInput } from '@/components/PatientSearch/SearchInput';
import { FloatingLabelInput } from '@/components/shared/FloatingLabelInput';
import { Button } from '@/components/shared/Button';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { patientService, formService, formQuestionsService } from '@/services/api';
import { useFormQuestionsCache } from '@/hooks/useFormQuestionsCache';
import type { Patient, FormResponseCreate, FormQuestionsData } from '@/types';

export const FormPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [nextReturnDate, setNextReturnDate] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isCreatingNewPatient, setIsCreatingNewPatient] = useState(false);
  const queryClient = useQueryClient();

  // Busca as perguntas do formulário padrão com cache persistente e versionamento
  const { data: standardQuestionsData, isLoading: isLoadingStandardQuestions } = useFormQuestionsCache();

  // Busca as perguntas do formulário adicional (para retornos)
  const { data: additionalQuestionsData, isLoading: isLoadingAdditionalQuestions } = useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.additional,
    queryFn: () => formQuestionsService.getAdditionalFormQuestions(),
    staleTime: 1000 * 60 * 10, // 10 minutos - form questions mudam raramente
    gcTime: 1000 * 60 * 30, // 30 minutos em cache
  });

  // Verifica se o paciente selecionado já tem formulários anteriores (para determinar se é primeira vez)
  const { data: existingFormResponses = [] } = useQuery({
    queryKey: selectedPatient
      ? queryKeys.formResponses.byPatient(selectedPatient.id)
      : ['formResponses', null],
    queryFn: () => {
      if (!selectedPatient) return [];
      return formService.getFormResponsesByPatient(selectedPatient.id);
    },
    enabled: !!selectedPatient && !isCreatingNewPatient,
    staleTime: 1000 * 60 * 2, // 2 minutos - dados podem mudar quando formulário é criado
    gcTime: 1000 * 60 * 5, // 5 minutos em cache
  });

  // Determina se é primeira vez preenchendo o formulário
  const isFirstTime = isCreatingNewPatient || (selectedPatient && existingFormResponses.length === 0);

  // Para retornos, carrega dados do formulário anterior para pre-popular campos necessários (ex: using_hormone_therapy)
  React.useEffect(() => {
    if (!isFirstTime && existingFormResponses.length > 0 && selectedPatient) {
      // Pega o formulário mais recente
      const latestForm = existingFormResponses[0];
      if (latestForm.form_data) {
        // Pre-popula campos essenciais para que as questões condicionais funcionem
        const previousData = latestForm.form_data as Record<string, unknown>;
        const essentialFields = ['using_hormone_therapy']; // Campos que podem ser necessários para condicionais

        const prePopulatedData: Record<string, unknown> = {};
        essentialFields.forEach(field => {
          if (previousData[field] !== undefined) {
            prePopulatedData[field] = previousData[field];
          }
        });

        // Mescla com dados já preenchidos no formulário atual
        setFormData(prev => ({ ...prePopulatedData, ...prev }));
      }
    }
  }, [isFirstTime, existingFormResponses, selectedPatient]);

  // Calcula automaticamente a data do próximo retorno baseado na resposta sobre tratamento hormonal
  React.useEffect(() => {
    const hormoneOverOneYear = formData.hormone_therapy_over_one_year;

    if (hormoneOverOneYear === 'Sim' || hormoneOverOneYear === 'Não') {
      const today = new Date();
      const returnDate = new Date(today);

      // Se faz tratamento há mais de 1 ano: retorno em 6 meses
      // Se faz tratamento há menos de 1 ano: retorno em 3 meses
      if (hormoneOverOneYear === 'Sim') {
        returnDate.setMonth(returnDate.getMonth() + 6);
      } else {
        returnDate.setMonth(returnDate.getMonth() + 3);
      }

      // Formata para date (YYYY-MM-DD) - apenas o dia, sem hora
      const year = returnDate.getFullYear();
      const month = String(returnDate.getMonth() + 1).padStart(2, '0');
      const day = String(returnDate.getDate()).padStart(2, '0');

      const formattedDate = `${year}-${month}-${day}`;
      setNextReturnDate(formattedDate);
    }
  }, [formData.hormone_therapy_over_one_year]);

  // Combina formulários se for primeira vez
  // Se for primeira vez: combina ambos os formulários (padrão + adicional)
  // Se for retorno: mostra apenas o formulário adicional
  const questionsData: FormQuestionsData | null = isFirstTime
    ? (standardQuestionsData && additionalQuestionsData
      ? {
        version: `${standardQuestionsData.version}+${additionalQuestionsData.version}`,
        last_updated: new Date().toISOString(),
        sections: [...standardQuestionsData.sections, ...additionalQuestionsData.sections],
      }
      : standardQuestionsData || null) // Fallback: mostra padrão se adicional ainda não carregou
    : additionalQuestionsData || null; // Retorno: apenas adicional

  const isLoadingQuestions = (isFirstTime && isLoadingStandardQuestions) ||
    (isFirstTime && isLoadingAdditionalQuestions) ||
    (!isFirstTime && isLoadingAdditionalQuestions);

  // Mutation para criar paciente
  const createPatientMutation = useMutation({
    mutationFn: patientService.createPatient,
    onSuccess: (newPatient) => {
      setSelectedPatient(newPatient);
      // Invalida todas as queries de pacientes (listas e detalhes)
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      // Também invalida retornos pois pode ter mudado
      queryClient.invalidateQueries({ queryKey: queryKeys.formResponses.upcomingReturns() });
    },
  });


  // Mutation para criar resposta de formulário
  const createFormMutation = useMutation({
    mutationFn: formService.createFormResponse,
    onSuccess: (_, variables) => {
      // Invalida form responses do paciente específico
      queryClient.invalidateQueries({
        queryKey: queryKeys.formResponses.byPatient(variables.patient_id)
      });
      // Invalida retornos (novo formulário pode ter novo retorno)
      queryClient.invalidateQueries({ queryKey: queryKeys.formResponses.upcomingReturns() });
      // Limpa formulário
      setSelectedPatient(null);
      setNextReturnDate('');
      setFormData({});
      setIsCreatingNewPatient(false);
      alert('Formulário salvo com sucesso!');
    },
  });

  // Inicia criação de novo paciente
  const handleStartNewPatient = () => {
    setIsCreatingNewPatient(true);
    setSelectedPatient(null);
    setFormData({});
    setNextReturnDate('');
  };

  // Cancela criação de novo paciente
  const handleCancelNewPatient = () => {
    setIsCreatingNewPatient(false);
    setFormData({});
    setNextReturnDate('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let patientId: number;
      let patientName: string;

      // Se é novo paciente, criar primeiro
      if (isCreatingNewPatient && !selectedPatient) {
        // Para novo paciente, nome é obrigatório no formulário
        patientName = (formData.patient_name as string) || '';
        if (!patientName || patientName.trim() === '') {
          alert('O nome do paciente é obrigatório');
          return;
        }
        const newPatient = await createPatientMutation.mutateAsync({
          full_name: patientName,
        });
        patientId = newPatient.id;
      } else if (selectedPatient) {
        // Para retorno, usa o paciente selecionado
        patientId = selectedPatient.id;
        patientName = selectedPatient.full_name;
      } else {
        alert('Selecione ou crie um paciente primeiro');
        return;
      }

      // Verifica se está usando hormônio e se faz há mais de um ano
      const hormoneOverOneYear = formData.hormone_therapy_over_one_year === 'Sim';

      // Formata a data do retorno (apenas dia, sem hora) - meia-noite UTC
      let formattedReturnDate: string | null = null;
      if (nextReturnDate) {
        // Adiciona a hora como meia-noite UTC para garantir consistência
        formattedReturnDate = new Date(nextReturnDate + 'T00:00:00Z').toISOString();
      }

      const formResponseData: FormResponseCreate = {
        patient_id: patientId,
        response_date: new Date().toISOString(),
        uses_hormone_over_1year: hormoneOverOneYear,
        form_data: Object.keys(formData).length > 0 ? formData : null,
        next_return_date: formattedReturnDate,
      };

      createFormMutation.mutate(formResponseData);
    } catch (error) {
      console.error('Erro ao salvar formulário:', error);
      alert('Erro ao salvar formulário. Tente novamente.');
    }
  };

  // Determina se deve mostrar o formulário completo
  const showFullForm = isCreatingNewPatient || selectedPatient;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-6">
            {isCreatingNewPatient && (
              <button
                type="button"
                onClick={handleCancelNewPatient}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Voltar</span>
              </button>
            )}
            <div className="flex items-start justify-between">
              <div className="text-left flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  {isCreatingNewPatient ? 'Novo Paciente' : 'Formulário de Pacientes'}
                </h1>
                <p className="text-gray-500 text-lg">
                  {isCreatingNewPatient
                    ? 'Preencha os dados do novo paciente'
                    : 'Busque um paciente existente ou crie um novo formulário'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSubmitForm} className="space-y-8">
          {/* Seção: Buscar/Criar Paciente - só aparece se NÃO estiver criando novo */}
          {!isCreatingNewPatient && (
            <div className="space-y-6">
              {/* Campo de busca melhorado */}
              <SearchInput
                onSelectPatient={(patient) => {
                  setSelectedPatient(patient);
                  setFormData({});
                }}
                navigateOnClick={true}
                placeholder="Buscar paciente"
              />

              {/* Separador OU */}
              {!selectedPatient && (
                <div className="flex items-center my-3">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="px-2 text-xs font-medium text-gray-400 uppercase tracking-wider">OU</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              )}

              {/* Opção de criar novo paciente */}
              {!selectedPatient && (
                <div className="bg-gradient-to-br from-[#55CDFC]/5 to-[#F7A8B8]/5 rounded-xl border-2 border-dashed border-[#55CDFC]/30 hover:border-[#55CDFC] transition-all duration-300">
                  <button
                    type="button"
                    onClick={handleStartNewPatient}
                    className="w-full py-6 text-gray-700 hover:text-[#55CDFC] transition-colors flex flex-col items-center justify-center space-y-3 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#55CDFC] flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-base block">Criar Novo Formulário</span>
                      <span className="text-sm text-gray-500 mt-1">Cadastrar um novo paciente no sistema</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Paciente Selecionado (existente) */}
              {selectedPatient && (
                <div className="bg-gradient-to-r from-[#55CDFC]/10 to-[#F7A8B8]/10 rounded-xl border-2 border-[#55CDFC]/20 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#55CDFC] uppercase tracking-wide mb-2">
                        Paciente Selecionado
                      </p>
                      <p className="text-xl font-bold text-gray-900">{selectedPatient.full_name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/patient/${selectedPatient.id}`)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#55CDFC] to-[#F7A8B8] rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                        title="Ver detalhes do paciente"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setFormData({});
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Remover seleção"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Seção: Formulário Completo */}
          {showFullForm && (
            <div className="space-y-6">
              {/* Formulário Dinâmico */}
              {isLoadingQuestions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#55CDFC] mx-auto mb-4"></div>
                  <p className="text-gray-500">Carregando formulário...</p>
                </div>
              ) : questionsData ? (
                <>
                  <DynamicForm
                    questionsData={questionsData}
                    formData={formData}
                    onChange={setFormData}
                  />

                  {/* Data do próximo retorno - calculada automaticamente - só aparece quando a pergunta for respondida */}
                  {formData.hormone_therapy_over_one_year && (
                    <div className="pt-4 border-t border-gray-200">
                      <FloatingLabelInput
                        label="Data do Próximo Retorno (calculada automaticamente)"
                        type="date"
                        value={nextReturnDate}
                        onChange={() => { }} // Sempre vazio, campo não editável
                        readOnly={true}
                      />
                      {(() => {
                        const hormoneOverOneYear = formData.hormone_therapy_over_one_year as string | undefined;
                        if (!hormoneOverOneYear) return null;
                        return (
                          <p className="mt-1 text-xs text-gray-500">
                            {hormoneOverOneYear === 'Sim'
                              ? 'Retorno calculado para 6 meses (tratamento há mais de 1 ano)'
                              : hormoneOverOneYear === 'Não'
                                ? 'Retorno calculado para 3 meses (tratamento há menos de 1 ano)'
                                : ''}
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Botão de submit */}
                  <div className="pt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={createFormMutation.isPending || createPatientMutation.isPending}
                      className={`w-full ${isCreatingNewPatient ? 'bg-[#F7A8B8] hover:bg-[#F7A8B8]/90' : ''}`}
                      style={isCreatingNewPatient ? { background: '#F7A8B8' } : { background: 'linear-gradient(90deg, #55CDFC, #F7A8B8)' }}
                    >
                      {isCreatingNewPatient ? 'Cadastrar Paciente' : 'Salvar Formulário'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-red-500">Erro ao carregar formulário. Tente recarregar a página.</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
