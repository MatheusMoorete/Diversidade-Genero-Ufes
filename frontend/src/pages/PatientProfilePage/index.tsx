/**
 * PatientProfilePage
 * Orchestrator component for the patient profile view.
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { patientService, formService, formQuestionsService } from '@/services/api';
import type { Patient, FormResponse, FormResponseUpdate, FormQuestionsData } from '@/types';
import { useToast } from '@/hooks/useToast';
import { PatientHeader } from './components/PatientHeader';
import { FormResponseItem } from './components/FormResponseItem';
import { DangerZone } from './components/DangerZone';
import { getPatientAge } from './utils';

const PatientProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const patientId = id ? parseInt(id, 10) : null;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [viewMode, setViewMode] = useState<'categorized' | 'full'>('categorized');

    // Queries
    const { data: patient, isLoading: isLoadingPatient } = useQuery<Patient>({
        queryKey: patientId ? queryKeys.patients.detail(patientId) : ['patient', null],
        queryFn: () => patientService.getPatient(patientId!),
        enabled: !!patientId,
    });

    const { data: formResponses, isLoading: isLoadingForms } = useQuery<FormResponse[]>({
        queryKey: patientId ? queryKeys.formResponses.byPatient(patientId) : ['formResponses', null],
        queryFn: () => formService.getFormResponsesByPatient(patientId!),
        enabled: !!patientId,
    });

    const { data: questionsData, isLoading: isLoadingQuestions } = useQuery<FormQuestionsData>({
        queryKey: queryKeys.formQuestions.standard,
        queryFn: () => formQuestionsService.getFormQuestions(),
    });

    const { data: additionalQuestionsData } = useQuery<FormQuestionsData>({
        queryKey: queryKeys.formQuestions.additional,
        queryFn: () => formQuestionsService.getAdditionalFormQuestions(),
    });

    // Mapa de Perguntas para Labels
    const fieldLabelsMap = useMemo(() => {
        const map: Record<string, string> = {};
        const processData = (data: FormQuestionsData | undefined) => {
            data?.sections.forEach(s => s.questions.forEach(q => { map[q.id] = q.label; }));
        };
        processData(questionsData);
        processData(additionalQuestionsData);
        return map;
    }, [questionsData, additionalQuestionsData]);

    const { showToast } = useToast();

    // Mutations
    const updateFormMutation = useMutation({
        mutationFn: ({ formId, data }: { formId: number; data: FormResponseUpdate }) =>
            formService.updateFormResponse(formId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.formResponses.byPatient(patientId!) });
            queryClient.invalidateQueries({ queryKey: queryKeys.formResponses.upcomingReturns() });
            showToast('Formulário atualizado com sucesso!', 'success');
        },
        onError: () => {
            showToast('Erro ao atualizar formulário. Tente novamente.', 'error');
        }
    });

    const deletePatientMutation = useMutation({
        mutationFn: () => patientService.deletePatient(patientId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.formResponses.upcomingReturns() });
            showToast('Paciente excluído com sucesso!', 'success');
            navigate('/form');
        },
        onError: () => {
            showToast('Erro ao excluir paciente.', 'error');
        }
    });

    if (isLoadingPatient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6FA5] mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando paciente...</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-sm">
                    <p className="text-red-600 text-lg mb-4 font-semibold">Paciente não encontrado</p>
                    <button
                        onClick={() => navigate('/form')}
                        className="px-6 py-2 bg-[#4A6FA5] text-white rounded-lg hover:bg-[#3b5984] transition-colors"
                    >
                        Voltar para início
                    </button>
                </div>
            </div>
        );
    }

    const latestForm = formResponses && formResponses.length > 0 ? formResponses[formResponses.length - 1] : null;
    const latestFormData = latestForm?.form_data as Record<string, unknown> || {};
    const patientAge = getPatientAge(latestFormData);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                <PatientHeader
                    patient={patient}
                    latestFormData={latestFormData}
                    patientAge={patientAge}
                    formCount={formResponses?.length || 0}
                />

                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Histórico de Atendimentos</h2>

                        {/* View Mode Toggle - Redesigned for better mobile UI */}
                        <div className="flex w-full sm:w-auto p-1 bg-gray-200/50 rounded-xl shadow-inner-sm">
                            <button
                                onClick={() => setViewMode('categorized')}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === 'categorized'
                                    ? 'bg-white text-[#4A6FA5] shadow-md transform scale-[1.02] sm:scale-105'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                                </svg>
                                <span>Resumo</span>
                            </button>
                            <button
                                onClick={() => setViewMode('full')}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === 'full'
                                    ? 'bg-white text-[#4A6FA5] shadow-md transform scale-[1.02] sm:scale-105'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="hidden xs:inline">Formulário Completo</span>
                                <span className="xs:hidden">Completo</span>
                            </button>
                        </div>
                    </div>

                    {isLoadingForms ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A6FA5] mx-auto mb-4"></div>
                            <p className="text-gray-500">Carregando prontuário...</p>
                        </div>
                    ) : formResponses && formResponses.length > 0 ? (
                        <div className="space-y-8">
                            {formResponses.map((formResponse, index) => (
                                <FormResponseItem
                                    key={formResponse.id}
                                    formResponse={formResponse}
                                    index={index}
                                    viewMode={viewMode}
                                    fieldLabelsMap={fieldLabelsMap}
                                    questionsData={questionsData}
                                    additionalQuestionsData={additionalQuestionsData}
                                    isLoadingQuestions={isLoadingQuestions}
                                    onUpdate={async (formId, data) => {
                                        await updateFormMutation.mutateAsync({ formId, data });
                                    }}
                                    isUpdating={updateFormMutation.isPending}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-dotted border-gray-300 p-12 text-center">
                            <p className="text-gray-500 font-medium">Nenhum atendimento registrado.</p>
                            <p className="text-gray-400 text-sm mt-1">Inicie um novo formulário para gerar o histórico.</p>
                        </div>
                    )}
                </div>

                <DangerZone
                    patientName={patient.full_name}
                    showConfirm={showDeleteConfirm}
                    setShowConfirm={setShowDeleteConfirm}
                    onDelete={() => deletePatientMutation.mutate()}
                    isDeleting={deletePatientMutation.isPending}
                />
            </div>
        </div>
    );
};

export default PatientProfilePage;
