/**
 * Tipos TypeScript para o sistema de gestão de pacientes.
 */

export interface User {
  id: number;
  username: string;
  created_at: string;
  is_form_admin: boolean;
}

export interface NeonSnapshotSummary {
  id?: string | null;
  name?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  source_branch_id?: string | null;
}

export interface NeonBackupStatus {
  configured: boolean;
  healthy: boolean;
  checked_at: string;
  project_id?: string | null;
  branch_id?: string | null;
  retention_days: number;
  max_age_hours: number;
  latest_snapshot?: NeonSnapshotSummary | null;
  created_snapshot?: NeonSnapshotSummary | null;
  recent_snapshots: NeonSnapshotSummary[];
  issues: string[];
  latest_snapshot_age_hours?: number | null;
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

export type ManagedFormKind = 'standard' | 'additional';

export interface FormQuestionCreatePayload {
  section_id: string;
  insert_after_question_id?: string;
  question: {
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
    };
  };
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
