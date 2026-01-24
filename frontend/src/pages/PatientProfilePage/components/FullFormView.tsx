import React from 'react';
import { formatDisplayValue } from '../utils';
import type { FormQuestionsData } from '@/types';

interface FullFormViewProps {
    data: Record<string, unknown>;
    questionsData: FormQuestionsData | undefined;
    additionalQuestionsData: FormQuestionsData | undefined;
}

/**
 * Componente para exibir o formulário completo na ordem original das perguntas.
 */
export const FullFormView: React.FC<FullFormViewProps> = ({ data, questionsData, additionalQuestionsData }) => {
    if (!questionsData) return null;

    const renderSection = (section: any) => {
        // Filtra perguntas que tenham resposta no form_data fornecido
        const answeredQuestions = section.questions.filter((q: any) =>
            data[q.id] !== undefined && data[q.id] !== null && data[q.id] !== ''
        );

        if (answeredQuestions.length === 0) return null;

        return (
            <div key={section.id} className="mb-8 last:mb-0">
                <h5 className="text-sm font-bold text-[#4A6FA5] uppercase tracking-wider mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {section.title}
                </h5>
                <div className="space-y-4">
                    {section.questions.map((q: any) => {
                        const val = data[q.id];
                        if (val === undefined || val === null || val === '') return null;
                        return (
                            <div key={q.id} className="text-sm flex flex-col sm:flex-row sm:items-start border-l-2 border-gray-100 pl-4 py-1 hover:border-blue-200 transition-colors">
                                <div className="sm:w-1/3 text-gray-500 font-medium mb-1 sm:mb-0">{q.label}:</div>
                                <div className="sm:w-2/3 text-gray-900 font-semibold">{formatDisplayValue(val)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 space-y-10">
            {questionsData.sections.map(renderSection)}
            {additionalQuestionsData && additionalQuestionsData.sections.map(renderSection)}
        </div>
    );
};
