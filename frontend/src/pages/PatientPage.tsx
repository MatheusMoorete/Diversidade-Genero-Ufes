/**
 * Página de detalhes do paciente.
 * Permite visualizar, editar formulários e excluir o paciente.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { FloatingLabelInput } from '@/components/shared/FloatingLabelInput';
import { Button } from '@/components/shared/Button';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { patientService, formService, formQuestionsService } from '@/services/api';
import type { Patient, FormResponse, FormResponseUpdate, FormQuestionsData } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PatientPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = id ? parseInt(id, 10) : null;

  const [isEditingForm, setIsEditingForm] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [nextReturnDate, setNextReturnDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Busca o paciente
  const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient>({
    queryKey: patientId ? queryKeys.patients.detail(patientId) : ['patient', null],
    queryFn: () => patientService.getPatient(patientId!),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5, // 5 minutos - dados do paciente mudam raramente
    gcTime: 1000 * 60 * 10, // 10 minutos em cache
  });

  // Busca os formulários do paciente
  const { data: formResponses, isLoading: isLoadingForms } = useQuery<FormResponse[]>({
    queryKey: patientId ? queryKeys.formResponses.byPatient(patientId) : ['formResponses', null],
    queryFn: () => formService.getFormResponsesByPatient(patientId!),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // 2 minutos - form responses podem mudar quando editados
    gcTime: 1000 * 60 * 5, // 5 minutos em cache
  });

  // Busca as perguntas do formulário padrão
  const { data: questionsData, isLoading: isLoadingQuestions } = useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.standard,
    queryFn: () => formQuestionsService.getFormQuestions(),
    staleTime: 1000 * 60 * 10, // 10 minutos - form questions mudam raramente
    gcTime: 1000 * 60 * 30, // 30 minutos em cache
  });

  // Busca as perguntas do formulário adicional
  const { data: additionalQuestionsData } = useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.additional,
    queryFn: () => formQuestionsService.getAdditionalFormQuestions(),
    staleTime: 1000 * 60 * 10, // 10 minutos - form questions mudam raramente
    gcTime: 1000 * 60 * 30, // 30 minutos em cache
  });

  // Cria um mapa de ID -> Label para todos os campos do formulário
  const fieldLabelsMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    // Adiciona labels do formulário padrão
    if (questionsData) {
      questionsData.sections.forEach((section) => {
        section.questions.forEach((question) => {
          map[question.id] = question.label;
        });
      });
    }
    
    // Adiciona labels do formulário adicional
    if (additionalQuestionsData) {
      additionalQuestionsData.sections.forEach((section) => {
        section.questions.forEach((question) => {
          map[question.id] = question.label;
        });
      });
    }
    
    return map;
  }, [questionsData, additionalQuestionsData]);

  // Mutation para atualizar formulário
  const updateFormMutation = useMutation({
    mutationFn: ({ formId, data }: { formId: number; data: FormResponseUpdate }) =>
      formService.updateFormResponse(formId, data),
    onSuccess: () => {
      // Invalida form responses do paciente
      if (patientId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.formResponses.byPatient(patientId) 
        });
      }
      // Invalida retornos (data de retorno pode ter mudado)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.formResponses.upcomingReturns() 
      });
      setIsEditingForm(null);
      setFormData({});
      setNextReturnDate('');
      alert('Formulário atualizado com sucesso!');
    },
  });

  // Mutation para excluir paciente
  const deletePatientMutation = useMutation({
    mutationFn: () => patientService.deletePatient(patientId!),
    onSuccess: () => {
      // Invalida todas as queries de pacientes
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
      // Invalida retornos (paciente deletado pode ter removido retornos)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.formResponses.upcomingReturns() 
      });
      alert('Paciente excluído com sucesso!');
      navigate('/form');
    },
  });

  // Inicia edição de um formulário
  const handleStartEdit = (formResponse: FormResponse) => {
    setIsEditingForm(formResponse.id);
    setFormData(formResponse.form_data || {});
    setNextReturnDate(
      formResponse.next_return_date
        ? format(new Date(formResponse.next_return_date), "yyyy-MM-dd")
        : ''
    );
  };

  // Cancela edição
  const handleCancelEdit = () => {
    setIsEditingForm(null);
    setFormData({});
    setNextReturnDate('');
  };

  // Salva edição do formulário
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditingForm) return;

    const usingHormone = formData.using_hormone_therapy === 'Sim';

    // Formata a data do retorno (apenas dia, sem hora) - meia-noite UTC
    let formattedReturnDate: string | null = null;
    if (nextReturnDate) {
      formattedReturnDate = new Date(nextReturnDate + 'T00:00:00Z').toISOString();
    }

    const updateData: FormResponseUpdate = {
      uses_hormone_over_1year: usingHormone,
      form_data: Object.keys(formData).length > 0 ? formData : null,
      next_return_date: formattedReturnDate,
    };

    updateFormMutation.mutate({ formId: isEditingForm, data: updateData });
  };

  // Confirma exclusão do paciente
  const handleDeletePatient = () => {
    if (window.confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
      deletePatientMutation.mutate();
    }
  };

  if (isLoadingPatient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#55CDFC] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando paciente...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Paciente não encontrado</p>
          <Button onClick={() => navigate('/form')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/form')}
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </button>
            <Button variant="danger" size="sm" onClick={handleDeletePatient} isLoading={deletePatientMutation.isPending}>
              Excluir Paciente
            </Button>
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-2">{patient.full_name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <p>
              Cadastrado em:{' '}
              {format(new Date(patient.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Lista de Formulários */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Formulários</h2>
          {isLoadingForms ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#55CDFC] mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando formulários...</p>
            </div>
          ) : formResponses && formResponses.length > 0 ? (
            <div className="space-y-4">
              {formResponses.map((formResponse) => (
                <div
                  key={formResponse.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {isEditingForm === formResponse.id ? (
                    // Modo de edição
                    <form onSubmit={handleSaveEdit} className="space-y-6">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Editando Formulário</h3>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={updateFormMutation.isPending}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" size="sm" isLoading={updateFormMutation.isPending}>
                            Salvar
                          </Button>
                        </div>
                      </div>

                      {isLoadingQuestions ? (
                        <div className="text-center py-8">
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

                          {/* Data do próximo retorno */}
                          <div className="pt-4 border-t border-gray-200">
                            <FloatingLabelInput
                              label="Data do Próximo Retorno"
                              type="date"
                              value={nextReturnDate}
                              onChange={(e) => setNextReturnDate(e.target.value)}
                            />
                          </div>
                        </>
                      ) : (
                        <p className="text-red-500">Erro ao carregar formulário</p>
                      )}
                    </form>
                  ) : (
                    // Modo de visualização
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Formulário #{formResponse.id}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <p>
                              Data da resposta:{' '}
                              {format(new Date(formResponse.response_date), "dd/MM/yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                            {formResponse.next_return_date && (
                              <p>
                                Próximo retorno:{' '}
                                {format(new Date(formResponse.next_return_date), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            )}
                            <p>
                              Usa hormônio há mais de 1 ano:{' '}
                              <span className={formResponse.uses_hormone_over_1year ? 'text-green-600' : 'text-gray-600'}>
                                {formResponse.uses_hormone_over_1year ? 'Sim' : 'Não'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleStartEdit(formResponse)}>
                          Editar
                        </Button>
                      </div>

                      {/* Exibe dados do formulário */}
                      {formResponse.form_data && Object.keys(formResponse.form_data).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Respostas do Formulário:</h4>
                          <div className="space-y-2">
                            {Object.entries(formResponse.form_data).map(([key, value]) => {
                              // Usa o label do mapa ou o ID técnico como fallback
                              const fieldLabel = fieldLabelsMap[key] || key;
                              return (
                                <div key={key} className="flex flex-col sm:flex-row sm:items-center text-sm">
                                  <span className="font-medium text-gray-700 sm:w-1/3">{fieldLabel}:</span>
                                  <span className="text-gray-600 sm:w-2/3">
                                    {Array.isArray(value) ? value.join(', ') : String(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Nenhum formulário encontrado para este paciente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

