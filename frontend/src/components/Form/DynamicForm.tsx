/**
 * Componente de formulário dinâmico baseado em JSON
 * Renderiza perguntas dinamicamente a partir da estrutura JSON
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FloatingLabelInput } from '@/components/shared/FloatingLabelInput';
import type { FormQuestionsData, FormQuestion, FormSection } from '@/types/form';

interface DynamicFormProps {
    questionsData: FormQuestionsData;
    formData: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
    errors?: Record<string, string>;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
    questionsData,
    formData,
    onChange,
    errors = {},
}) => {
    const [localFormData, setLocalFormData] = useState<Record<string, unknown>>(formData);

    // Atualiza localFormData quando formData externo muda
    useEffect(() => {
        setLocalFormData(formData);
    }, [formData]);

    // Calcula valores derivados (ex: IMC)
    const calculatedValues = useMemo(() => {
        const calculated: Record<string, number> = {};

        questionsData.sections.forEach((section) => {
            section.questions.forEach((question) => {
                const calc = question.calculated;
                if (calc && typeof calc === 'object' && calc.depends_on) {
                    const dependsOn = calc.depends_on;
                    const allDepsAvailable = dependsOn.every((dep: string) => localFormData[dep] != null);

                    if (allDepsAvailable) {
                        try {
                            // Calcula IMC: weight / ((height / 100) ^ 2)
                            if (question.id === 'bmi' && localFormData.weight && localFormData.height) {
                                const weight = Number(localFormData.weight);
                                const height = Number(localFormData.height);
                                if (height > 0) {
                                    calculated.bmi = Number((weight / Math.pow(height / 100, 2)).toFixed(2));
                                }
                            }
                        } catch (error) {
                            console.error(`Erro ao calcular ${question.id}:`, error);
                        }
                    }
                }
            });
        });

        return calculated;
    }, [localFormData, questionsData]);

    // Verifica se uma pergunta deve ser exibida (condicionais)
    const shouldShowQuestion = (question: FormQuestion): boolean => {
        if (!question.conditional) return true;

        const { depends_on, value, value_not } = question.conditional;
        const dependentValue = localFormData[depends_on];

        // Se tiver value_not, mostra se o valor for diferente
        if (value_not !== undefined) {
            return dependentValue !== value_not;
        }

        // Se tiver value, mostra se o valor for igual
        if (typeof value === 'boolean') {
            return dependentValue === value;
        }
        return dependentValue === value;
    };

    const handleChange = (questionId: string, value: unknown) => {
        const newData = { ...localFormData, [questionId]: value };

        // Atualiza valores calculados
        const question = questionsData.sections
            .flatMap((s) => s.questions)
            .find((q) => q.id === questionId);

        if (question?.calculated) {
            const calculatedValue = calculatedValues[questionId];
            if (calculatedValue != null) {
                newData[questionId] = calculatedValue;
            }
        }

        setLocalFormData(newData);
        onChange(newData);
    };

    const renderQuestion = (question: FormQuestion) => {
        if (!shouldShowQuestion(question)) return null;

        const rawValue = question.calculated
            ? calculatedValues[question.id] ?? localFormData[question.id]
            : localFormData[question.id];

        // Converte unknown para string/number/boolean conforme necessário
        const value = rawValue != null ? rawValue : '';
        const stringValue = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
        const numberValue = typeof value === 'number' ? value : typeof value === 'string' && value ? Number(value) : null;

        const error = errors[question.id];

        switch (question.type) {
            case 'radio':
                return (
                    <div key={question.id} className="w-full">
                        <label className="block text-base font-medium text-gray-900 mb-4">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-3">
                            {question.options?.map((option) => {
                                const isChecked = stringValue === option;
                                return (
                                    <label
                                        key={option}
                                        className="flex items-center space-x-3 cursor-pointer group"
                                    >
                                        <div className="relative flex items-center flex-shrink-0">
                                            <input
                                                type="radio"
                                                name={question.id}
                                                value={option}
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (isChecked && !question.required) {
                                                        handleChange(question.id, '');
                                                    } else {
                                                        handleChange(question.id, e.target.value);
                                                    }
                                                }}
                                                className="sr-only"
                                            />
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                ${isChecked
                                                    ? 'border-[#4A6FA5] bg-white'
                                                    : 'border-gray-400 bg-white group-hover:border-[#4A6FA5]'
                                                }
                                            `}>
                                                {isChecked && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#4A6FA5]"></div>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-base flex-1 ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                            {option}
                                        </span>
                                    </label>
                                );
                            })}
                            {question.allow_other && (
                                <div className="mt-4 space-y-3">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <div className="relative flex items-center flex-shrink-0">
                                            <input
                                                type="radio"
                                                name={question.id}
                                                value="__other__"
                                                checked={stringValue !== '' && !question.options?.includes(stringValue)}
                                                onChange={() => {
                                                    handleChange(question.id, '');
                                                    // Foca no input de texto após um pequeno delay
                                                    setTimeout(() => {
                                                        const otherInput = document.getElementById(`${question.id}_other_input`) as HTMLInputElement;
                                                        if (otherInput) {
                                                            otherInput.focus();
                                                        }
                                                    }, 100);
                                                }}
                                                className="sr-only"
                                            />
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                ${stringValue !== '' && !question.options?.includes(stringValue)
                                                    ? 'border-[#4A6FA5] bg-white'
                                                    : 'border-gray-400 bg-white group-hover:border-[#4A6FA5]'
                                                }
                                            `}>
                                                {stringValue !== '' && !question.options?.includes(stringValue) && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#4A6FA5]"></div>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-base font-medium text-gray-700">Outro:</span>
                                    </label>
                                    <input
                                        id={`${question.id}_other_input`}
                                        type="text"
                                        value={!question.options?.includes(stringValue) ? stringValue : ''}
                                        onChange={(e) => handleChange(question.id, e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg
                                            focus:border-[#4A6FA5] focus:outline-none focus:ring-4 focus:ring-blue-100
                                            bg-white transition-all text-base
                                            placeholder:text-gray-400"
                                        placeholder="Especifique..."
                                    />
                                </div>
                            )}
                        </div>
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>
                );

            case 'checkbox':
                return (
                    <div key={question.id} className="w-full">
                        <label className="block text-base font-medium text-gray-900 mb-4">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-3">
                            {question.options?.map((option) => {
                                const selectedValues = Array.isArray(value) ? value : [];
                                const isChecked = selectedValues.includes(option);
                                return (
                                    <label
                                        key={option}
                                        className="flex items-center space-x-3 cursor-pointer group"
                                    >
                                        <div className="relative flex items-center flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const currentValues = Array.isArray(value) ? [...value] : [];
                                                    if (e.target.checked) {
                                                        currentValues.push(option);
                                                    } else {
                                                        const idx = currentValues.indexOf(option);
                                                        if (idx > -1) currentValues.splice(idx, 1);
                                                    }
                                                    handleChange(question.id, currentValues);
                                                }}
                                                className="sr-only"
                                            />
                                            <div className={`
                                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                ${isChecked
                                                    ? 'border-[#64748B] bg-[#64748B]'
                                                    : 'border-gray-400 bg-white group-hover:border-[#64748B]'
                                                }
                                            `}>
                                                {isChecked && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-base flex-1 ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                            {option}
                                        </span>
                                    </label>
                                );
                            })}
                            {question.allow_other && (
                                <div className="mt-4 space-y-3">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                        <div className="relative flex items-center flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(value) && value.some(v => !question.options?.includes(v))}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        // Foca no input de texto após um pequeno delay
                                                        setTimeout(() => {
                                                            const otherInput = document.getElementById(`${question.id}_other_input`) as HTMLInputElement;
                                                            if (otherInput) {
                                                                otherInput.focus();
                                                            }
                                                        }, 100);
                                                    }
                                                }}
                                                className="sr-only"
                                            />
                                            <div className={`
                                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                ${Array.isArray(value) && value.some(v => !question.options?.includes(v))
                                                    ? 'border-[#64748B] bg-[#64748B]'
                                                    : 'border-gray-400 bg-white group-hover:border-[#64748B]'
                                                }
                                            `}>
                                                {Array.isArray(value) && value.some(v => !question.options?.includes(v)) && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-base font-medium text-gray-700">Outro:</span>
                                    </label>
                                    <input
                                        id={`${question.id}_other_input`}
                                        type="text"
                                        onChange={(e) => {
                                            const currentValues = Array.isArray(value) ? value.filter(v => question.options?.includes(v)) : [];
                                            if (e.target.value) {
                                                currentValues.push(e.target.value);
                                            }
                                            handleChange(question.id, currentValues);
                                        }}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg
                                            focus:border-[#64748B] focus:outline-none focus:ring-4 focus:ring-slate-100
                                            bg-white transition-all text-base
                                            placeholder:text-gray-400"
                                        placeholder="Especifique..."
                                    />
                                </div>
                            )}
                        </div>
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>
                );

            case 'boolean':
                return (
                    <div key={question.id} className="flex items-start space-x-3 py-2">
                        <input
                            type="checkbox"
                            id={question.id}
                            checked={!!value}
                            onChange={(e) => handleChange(question.id, e.target.checked)}
                            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor={question.id} className="text-base text-gray-700 cursor-pointer">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                    </div>
                );

            case 'select':
                return (
                    <div key={question.id} className="w-full">
                        <label className="block text-base font-medium text-gray-900 mb-2">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            id={question.id}
                            value={stringValue}
                            onChange={(e) => handleChange(question.id, e.target.value)}
                            className={`
                                w-full px-4 py-3 border-2 border-gray-200 rounded-lg
                                focus:border-[#4A6FA5] focus:outline-none focus:ring-4 focus:ring-blue-100
                                bg-white transition-all
                                text-gray-900
                                ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
              `}
                        >
                            <option value="">Selecione...</option>
                            {question.options?.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {error && <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </p>}
                    </div>
                );

            case 'multiselect':
                return (
                    <div key={question.id} className="w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="space-y-2">
                            {question.options?.map((option) => {
                                const selectedValues = Array.isArray(value) ? value : [];
                                const isChecked = selectedValues.includes(option);
                                return (
                                    <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentValues = Array.isArray(value) ? value : [];
                                                const newValues = e.target.checked
                                                    ? [...currentValues, option]
                                                    : currentValues.filter((v) => v !== option);
                                                handleChange(question.id, newValues);
                                            }}
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">{option}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                    </div>
                );

            case 'textarea':
                return (
                    <div key={question.id} className="w-full">
                        <label className="block text-base font-medium text-gray-900 mb-2">
                            {question.label}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                            id={question.id}
                            value={stringValue}
                            onChange={(e) => handleChange(question.id, e.target.value)}
                            rows={4}
                            className={`
                                w-full px-4 py-3 border-2 border-gray-200 rounded-lg
                                focus:border-[#4A6FA5] focus:outline-none focus:ring-4 focus:ring-blue-100
                                bg-white resize-none transition-all
                                placeholder:text-gray-400
                                ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
              `}
                            placeholder={question.placeholder}
                        />
                        {error && <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </p>}
                    </div>
                );

            case 'number':
                return (
                    <FloatingLabelInput
                        key={question.id}
                        label={question.label}
                        type="number"
                        value={numberValue != null ? String(numberValue) : ''}
                        onChange={(e) => handleChange(question.id, e.target.value ? Number(e.target.value) : null)}
                        min={question.min}
                        max={question.max}
                        readOnly={question.readonly}
                        error={error}
                        required={question.required}
                    />
                );

            case 'date':
                return (
                    <FloatingLabelInput
                        key={question.id}
                        label={question.label}
                        type="date"
                        value={stringValue}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        error={error}
                        required={question.required}
                    />
                );

            case 'tel':
                return (
                    <FloatingLabelInput
                        key={question.id}
                        label={question.label}
                        type="tel"
                        value={stringValue}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        error={error}
                        required={question.required}
                    />
                );

            default:
                return (
                    <FloatingLabelInput
                        key={question.id}
                        label={question.label}
                        type="text"
                        value={stringValue}
                        onChange={(e) => handleChange(question.id, e.target.value)}
                        placeholder={question.placeholder}
                        error={error}
                        required={question.required}
                    />
                );
        }
    };

    return (
        <div className="space-y-8">
            {questionsData.sections.map((section: FormSection) => (
                <div key={section.id} className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                        {section.title}
                    </h3>
                    <div className="space-y-6">
                        {section.questions.map((question) => renderQuestion(question))}
                    </div>
                </div>
            ))}
        </div>
    );
};

