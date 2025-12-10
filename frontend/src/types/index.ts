/**
 * Tipos TypeScript para o sistema de gestão de pacientes.
 */

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Patient {
  id: number;
  full_name: string;
  created_by_user_id: number;
  created_at: string;
}

export interface FormResponse {
  id: number;
  patient_id: number;
  response_date: string;
  uses_hormone_over_1year: boolean;
  form_data?: Record<string, any> | null;
  next_return_date?: string | null;
  created_by_user_id: number;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface PatientCreate {
  full_name: string;
}

export interface PatientUpdate {
  full_name?: string;
}

export interface FormResponseCreate {
  patient_id: number;
  response_date: string;
  uses_hormone_over_1year: boolean;
  form_data?: Record<string, any> | null;
  next_return_date?: string | null;
}

// Re-export form types
export type { FormQuestion, FormSection, FormQuestionsData } from './form';

export interface FormResponseUpdate {
  response_date?: string;
  uses_hormone_over_1year?: boolean;
  form_data?: Record<string, any> | null;
  next_return_date?: string | null;
}

export interface ApiError {
  detail: string;
}

export interface ImportResult {
  message: string;
  pacientes_criados: number;
  pacientes_com_erro: number;
  total_processado: number;
  erros_validacao: string[];
  detalhes_criados: Array<{ id: number; full_name: string }>;
  detalhes_erros: Array<{ paciente: string; erro: string }>;
}

