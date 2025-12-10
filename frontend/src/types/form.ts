/**
 * Tipos para o sistema de formulário dinâmico
 */

export interface FormQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'tel' | 'radio' | 'checkbox';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  readonly?: boolean;
  allow_other?: boolean;
  conditional?: {
    depends_on: string;
    value?: string | boolean;
    value_not?: string;
  };
  calculated?: {
    formula: string;
    depends_on: string[];
  } | boolean;
}

export interface FormSection {
  id: string;
  title: string;
  questions: FormQuestion[];
}

export interface FormQuestionsData {
  version: string;
  last_updated: string;
  sections: FormSection[];
}



