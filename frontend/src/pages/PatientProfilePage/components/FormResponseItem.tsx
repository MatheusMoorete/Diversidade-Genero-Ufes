import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FloatingLabelInput } from '@/components/shared/FloatingLabelInput';
import { DynamicForm } from '@/components/Form/DynamicForm';
import { DataSection } from './DataSection';
import { FullFormView } from './FullFormView';
import { FIELD_CATEGORIES } from '../constants';
import type { FormResponse, FormQuestionsData, FormResponseUpdate } from '@/types';

interface FormResponseItemProps {
    formResponse: FormResponse;
    index: number;
    totalForms: number;
    viewMode: 'categorized' | 'full';
    fieldLabelsMap: Record<string, string>;
    questionsData: FormQuestionsData | undefined;
    additionalQuestionsData: FormQuestionsData | undefined;
    isLoadingQuestions: boolean;
    onUpdate: (formId: number, data: FormResponseUpdate) => Promise<void>;
    isUpdating: boolean;
}

/**
 * Componente que exibe e gerencia um formulário individual (Visualização ou Edição).
 */
export const FormResponseItem: React.FC<FormResponseItemProps> = ({
    formResponse,
    index,
    totalForms,
    viewMode,
    fieldLabelsMap,
    questionsData,
    additionalQuestionsData,
    isLoadingQuestions,
    onUpdate,
    isUpdating
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<Record<string, unknown>>(formResponse.form_data || {});
    const [nextReturnDate, setNextReturnDate] = useState(
        formResponse.next_return_date ? format(new Date(formResponse.next_return_date), "yyyy-MM-dd") : ''
    );

    const handleStartEdit = () => {
        setEditFormData(formResponse.form_data || {});
        setNextReturnDate(formResponse.next_return_date ? format(new Date(formResponse.next_return_date), "yyyy-MM-dd") : '');
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();

        const usingHormone = editFormData.using_hormone_therapy === 'Sim';
        let formattedReturnDate: string | null = null;
        if (nextReturnDate) {
            formattedReturnDate = new Date(nextReturnDate + 'T00:00:00Z').toISOString();
        }

        const updateData: FormResponseUpdate = {
            uses_hormone_over_1year: usingHormone,
            form_data: Object.keys(editFormData).length > 0 ? editFormData : null,
            next_return_date: formattedReturnDate,
        };

        await onUpdate(formResponse.id, updateData);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-300">
                <form onSubmit={handleSaveEdit} className="p-6 md:p-8 space-y-8 relative">
                    <div className="sticky top-[60px] lg:top-0 z-30 bg-white/95 backdrop-blur-sm shadow-sm -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <h3 className="text-lg font-semibold text-gray-900">Editando Atendimento</h3>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isUpdating}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-all text-xs font-bold shadow-sm disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Descartar
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#4A6FA5] text-white hover:bg-[#3b5984] transition-all text-xs font-bold shadow-md disabled:opacity-50"
                            >
                                {isUpdating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                Salvar
                            </button>
                        </div>
                    </div>

                    {isLoadingQuestions ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6FA5] mx-auto mb-4"></div>
                            <p className="text-gray-500 text-sm">Carregando estrutura do formulário...</p>
                        </div>
                    ) : questionsData ? (
                        <>
                            <DynamicForm
                                questionsData={questionsData}
                                formData={editFormData}
                                onChange={setEditFormData}
                            />

                            <div className="pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-semibold text-gray-700 mb-4">Retorno</h4>
                                <div className="max-w-xs">
                                    <FloatingLabelInput
                                        label="Agendar Próximo Retorno"
                                        type="date"
                                        value={nextReturnDate}
                                        onChange={(e) => setNextReturnDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-red-500 p-4 bg-red-50 rounded-lg text-sm border border-red-100">
                            Erro ao carregar estrutura do formulário.
                        </div>
                    )}
                </form>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header do formulário */}
            <div className="bg-gray-50/80 px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#4A6FA5] text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm">
                            {totalForms - index}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                {format(new Date(formResponse.response_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </h3>
                            <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-[10px] sm:text-xs text-gray-500">
                                {formResponse.next_return_date && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">
                                        🔄 {format(new Date(formResponse.next_return_date), "dd/MM/yyyy")}
                                    </span>
                                )}
                                <span className={`flex items-center gap-1 ${formResponse.uses_hormone_over_1year ? 'text-green-600 font-medium' : ''}`}>
                                    {formResponse.uses_hormone_over_1year ? '✓ Hormônio +1a' : '○ Hormônio <1a'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleStartEdit}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#4A6FA5] hover:border-[#4A6FA5] transition-all text-xs font-semibold shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <span className="hidden sm:inline">Editar</span>
                    </button>
                </div>
            </div>

            {/* Conteúdo dependente do ViewMode */}
            {formResponse.form_data && Object.keys(formResponse.form_data).length > 0 ? (
                viewMode === 'categorized' ? (
                    <div className="p-6 md:p-8 space-y-6">
                        {Object.entries(FIELD_CATEGORIES).map(([key, category]) => (
                            <DataSection
                                key={key}
                                title={category.title}
                                icon={category.icon}
                                data={formResponse.form_data as Record<string, unknown>}
                                fieldLabelsMap={fieldLabelsMap}
                                fields={category.fields}
                            />
                        ))}
                    </div>
                ) : (
                    <FullFormView
                        data={formResponse.form_data as Record<string, unknown>}
                        questionsData={questionsData}
                        additionalQuestionsData={additionalQuestionsData}
                    />
                )
            ) : (
                <div className="p-12 text-center text-gray-400">
                    <p>Nenhum dado detalhado registrado para este atendimento.</p>
                </div>
            )}
        </div>
    );
};
