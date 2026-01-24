import { format, differenceInYears, parseISO } from 'date-fns';

/**
 * Função para formatar valores de exibição vindos do form_data.
 */
export const formatDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';

    // Formata datas YYYY-MM-DD para DD/MM/YYYY
    const strValue = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
        try {
            return format(parseISO(strValue), 'dd/MM/yyyy');
        } catch {
            return strValue;
        }
    }

    return strValue;
};

/**
 * Calcula a idade a partir da data de nascimento no formulário.
 */
export const getPatientAge = (formData: Record<string, unknown>): number | null => {
    const birthDate = formData.birth_date as string;
    if (!birthDate) return null;
    try {
        return differenceInYears(new Date(), parseISO(birthDate));
    } catch {
        return null;
    }
};
