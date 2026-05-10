/**
 * Configuracao central da API.
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  ApiError,
  ConsultationDraft,
  ConsultationDraftPayload,
  FormQuestionCreatePayload,
  FormQuestionOrderPayload,
  FormQuestionReorderPayload,
  FormQuestionsData,
  FormResponse,
  FormResponseCreate,
  FormResponseUpdate,
  ImportResult,
  LoginRequest,
  LoginResponse,
  ManagedFormKind,
  NeonBackupStatus,
  Patient,
  PatientCreate,
  PatientUpdate,
  User,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let onUnauthorizedCallback: (() => void) | null = null;

interface ApiRequestConfig extends AxiosRequestConfig {
  skipUnauthorizedHandler?: boolean;
}

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiError>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const requestConfig = error.config as ApiRequestConfig | undefined;

    if (error.response?.status === 401 && !requestConfig?.skipUnauthorizedHandler) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<LoginResponse>('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async register(username: string, password: string) {
    const response = await api.post('/api/auth/register', {
      username,
      password,
    });
    return response.data;
  },

  async getCurrentUser(options?: { skipUnauthorizedHandler?: boolean }): Promise<User> {
    const config: ApiRequestConfig = {
      skipUnauthorizedHandler: options?.skipUnauthorizedHandler,
    };
    const response = await api.get<User>('/api/auth/me', config);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },
};

export const patientService = {
  async searchPatients(
    search?: string,
    skip: number = 0,
    limit: number = 100,
    orderBy?: 'name' | 'created_at'
  ): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (orderBy) params.append('order_by', orderBy);

    const response = await api.get<Patient[]>(`/api/patients?${params.toString()}`);
    return response.data;
  },

  async getPatient(id: number): Promise<Patient> {
    const response = await api.get<Patient>(`/api/patients/${id}`);
    return response.data;
  },

  async createPatient(data: PatientCreate): Promise<Patient> {
    const response = await api.post<Patient>('/api/patients', data);
    return response.data;
  },

  async updatePatient(id: number, data: PatientUpdate): Promise<Patient> {
    const response = await api.put<Patient>(`/api/patients/${id}`, data);
    return response.data;
  },

  async deletePatient(id: number): Promise<void> {
    await api.delete(`/api/patients/${id}`);
  },
};

export const formService = {
  async createFormResponse(data: FormResponseCreate): Promise<FormResponse> {
    const response = await api.post<FormResponse>('/api/form-responses', data);
    return response.data;
  },

  async getFormResponsesByPatient(patientId: number): Promise<FormResponse[]> {
    const response = await api.get<FormResponse[]>(`/api/form-responses/patient/${patientId}`);
    return response.data;
  },

  async getUpcomingReturns(days: number = 15): Promise<FormResponse[]> {
    const response = await api.get<FormResponse[]>(`/api/form-responses/upcoming-returns?days=${days}`);
    return response.data;
  },

  async getFormResponse(id: number): Promise<FormResponse> {
    const response = await api.get<FormResponse>(`/api/form-responses/${id}`);
    return response.data;
  },

  async updateFormResponse(id: number, data: FormResponseUpdate): Promise<FormResponse> {
    const response = await api.put<FormResponse>(`/api/form-responses/${id}`, data);
    return response.data;
  },

  async deleteFormResponse(id: number): Promise<void> {
    await api.delete(`/api/form-responses/${id}`);
  },

  async getConsultationDraft(): Promise<ConsultationDraft | null> {
    const response = await api.get<ConsultationDraft | null>('/api/form-responses/drafts/consultation', {
      skipUnauthorizedHandler: true,
    } as ApiRequestConfig);
    return response.data;
  },

  async saveConsultationDraft(data: ConsultationDraftPayload): Promise<ConsultationDraft> {
    const response = await api.put<ConsultationDraft>('/api/form-responses/drafts/consultation', {
      ...data,
      draft_key: 'consultation',
    }, {
      skipUnauthorizedHandler: true,
    } as ApiRequestConfig);
    return response.data;
  },

  async deleteConsultationDraft(): Promise<void> {
    await api.delete('/api/form-responses/drafts/consultation', {
      skipUnauthorizedHandler: true,
    } as ApiRequestConfig);
  },
};

export const exportService = {
  async exportExcel(): Promise<Blob> {
    const response = await api.post('/api/export/excel', {}, {
      responseType: 'blob',
    });
    return response.data;
  },

  async importExcel(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImportResult>('/api/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const backupService = {
  async downloadBackup(): Promise<Blob> {
    const response = await api.get('/api/backup/full', {
      responseType: 'blob',
    });
    return response.data;
  },

  async getStats(): Promise<{
    username: string;
    patients: { active: number; deleted: number; total: number };
    form_responses: { active: number; deleted: number; total: number };
  }> {
    const response = await api.get('/api/backup/stats');
    return response.data;
  },

  async getNeonStatus(): Promise<NeonBackupStatus> {
    const response = await api.get<NeonBackupStatus>('/api/backup/neon/status');
    return response.data;
  },

  async createNeonSnapshot(): Promise<NeonBackupStatus> {
    const response = await api.post<NeonBackupStatus>('/api/backup/neon/snapshot');
    return response.data;
  },
};

export const formQuestionsService = {
  async getFormQuestions(): Promise<FormQuestionsData> {
    const response = await api.get<FormQuestionsData>('/api/form-questions', {
      params: { _: Date.now() },
    });
    return response.data;
  },

  async getAdditionalFormQuestions(): Promise<FormQuestionsData> {
    const response = await api.get<FormQuestionsData>('/api/form-questions/additional', {
      params: { _: Date.now() },
    });
    return response.data;
  },

  async addQuestion(
    formKind: ManagedFormKind,
    payload: FormQuestionCreatePayload
  ): Promise<FormQuestionsData> {
    const response = await api.post<FormQuestionsData>(`/api/form-questions/${formKind}/questions`, payload);
    return response.data;
  },

  async removeQuestion(
    formKind: ManagedFormKind,
    questionId: string
  ): Promise<FormQuestionsData> {
    const response = await api.delete<FormQuestionsData>(`/api/form-questions/${formKind}/questions/${questionId}`);
    return response.data;
  },

  async updateQuestion(
    formKind: ManagedFormKind,
    questionId: string,
    payload: FormQuestionCreatePayload
  ): Promise<FormQuestionsData> {
    const response = await api.put<FormQuestionsData>(`/api/form-questions/${formKind}/questions/${questionId}`, payload);
    return response.data;
  },

  async reorderQuestion(
    formKind: ManagedFormKind,
    questionId: string,
    payload: FormQuestionReorderPayload
  ): Promise<FormQuestionsData> {
    const response = await api.put<FormQuestionsData>(
      `/api/form-questions/${formKind}/questions/${questionId}/position`,
      payload
    );
    return response.data;
  },

  async saveQuestionOrder(
    formKind: ManagedFormKind,
    payload: FormQuestionOrderPayload
  ): Promise<FormQuestionsData> {
    const response = await api.put<FormQuestionsData>(
      `/api/form-questions/${formKind}/questions/order`,
      payload
    );
    return response.data;
  },
};

export default api;
