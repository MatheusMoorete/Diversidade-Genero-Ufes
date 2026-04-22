import React from 'react';
import { formatDisplayValue } from '../utils';

interface DataSectionProps {
    title: string;
    icon: string;
    data: Record<string, unknown>;
    fieldLabelsMap: Record<string, string>;
    fields: string[];
    showEmptyFields?: boolean;
}

/**
 * Componente para exibir uma seção de dados organiza em grade (Visão de Resumo).
 */
export const DataSection: React.FC<DataSectionProps> = ({
    title,
    icon,
    data,
    fieldLabelsMap,
    fields,
    showEmptyFields = false,
}) => {
    const relevantFields = showEmptyFields
        ? fields
        : fields.filter(field => data[field] !== undefined && data[field] !== null && data[field] !== '');

    if (relevantFields.length === 0) return null;

    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>{icon}</span>
                {title}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {relevantFields.map(field => (
                    <div key={field} className="text-sm">
                        <span className="text-gray-500">{fieldLabelsMap[field] || field}:</span>
                        <span className="ml-2 text-gray-900 font-medium">{formatDisplayValue(data[field])}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
