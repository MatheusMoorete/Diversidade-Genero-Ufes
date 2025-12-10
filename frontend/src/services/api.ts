/**
 * Configuração do Axios com interceptors para autenticação JWT.
 * Centraliza todas as chamadas à API do backend.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  Patient,
  PatientCreate,
  PatientUpdate,
  FormResponse,
  FormResponseCreate,
  FormResponseUpdate,
  ApiError,
  ImportResult,
  FormQuestionsData,
} from '@/types';

// URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Callback global para abrir modal de login quando houver 401
let onUnauthorizedCallback: (() => void) | null = null;

/**
 * Define o callback que será chamado quando houver erro 401
 */
export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Cria instância do axios
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT nas requisições
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Chama o callback para abrir o modal de login
      // Se não houver callback definido, redireciona para a página de login
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      } else {
        // Fallback: redireciona se o callback não estiver configurado
      window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Serviço de autenticação
 */
export const authService = {
  /**
   * Realiza login e retorna token JWT
   */
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

  /**
   * Registra novo usuário
   */
  async register(username: string, password: string) {
    const response = await api.post('/api/auth/register', {
      username,
      password,
    });
    return response.data;
  },
};

/**
 * Serviço de pacientes
 */
export const patientService = {
  /**
   * Busca pacientes com paginação, busca e ordenação opcionais
   */
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

  /**
   * Busca um paciente por ID
   */
  async getPatient(id: number): Promise<Patient> {
    const response = await api.get<Patient>(`/api/patients/${id}`);
    return response.data;
  },

  /**
   * Cria um novo paciente
   */
  async createPatient(data: PatientCreate): Promise<Patient> {
    const response = await api.post<Patient>('/api/patients', data);
    return response.data;
  },


  /**
   * Atualiza um paciente existente
   */
  async updatePatient(id: number, data: PatientUpdate): Promise<Patient> {
    const response = await api.put<Patient>(`/api/patients/${id}`, data);
    return response.data;
  },

  /**
   * Remove um paciente
   */
  async deletePatient(id: number): Promise<void> {
    await api.delete(`/api/patients/${id}`);
  },
};

/**
 * Serviço de formulários
 */
export const formService = {
  /**
   * Cria uma nova resposta de formulário
   */
  async createFormResponse(data: FormResponseCreate): Promise<FormResponse> {
    const response = await api.post<FormResponse>('/api/form-responses', data);
    return response.data;
  },

  /**
   * Busca respostas de formulário de um paciente
   */
  async getFormResponsesByPatient(patientId: number): Promise<FormResponse[]> {
    const response = await api.get<FormResponse[]>(`/api/form-responses/patient/${patientId}`);
    return response.data;
  },

  /**
   * Busca todos os retornos agendados dos próximos N dias (padrão: 15)
   */
  async getUpcomingReturns(days: number = 15): Promise<FormResponse[]> {
    const response = await api.get<FormResponse[]>(`/api/form-responses/upcoming-returns?days=${days}`);
    return response.data;
  },

  /**
   * Busca uma resposta de formulário por ID
   */
  async getFormResponse(id: number): Promise<FormResponse> {
    const response = await api.get<FormResponse>(`/api/form-responses/${id}`);
    return response.data;
  },

  /**
   * Atualiza uma resposta de formulário
   */
  async updateFormResponse(id: number, data: FormResponseUpdate): Promise<FormResponse> {
    const response = await api.put<FormResponse>(`/api/form-responses/${id}`, data);
    return response.data;
  },

  /**
   * Remove uma resposta de formulário
   */
  async deleteFormResponse(id: number): Promise<void> {
    await api.delete(`/api/form-responses/${id}`);
  },
};

/**
 * Serviço de exportação/importação
 */
export const exportService = {
  /**
   * Exporta pacientes para Excel
   */
  async exportExcel(): Promise<Blob> {
    const response = await api.post('/api/export/excel', {}, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Importa pacientes de um arquivo Excel
   */
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

/**
 * Serviço de formulário
 */
export const formQuestionsService = {
  /**
   * Busca a estrutura de perguntas do formulário
   */
  async getFormQuestions(): Promise<FormQuestionsData> {
    const response = await api.get<FormQuestionsData>('/api/form-questions');
    return response.data;
  },
  /**
   * Busca a estrutura de perguntas do formulário adicional (para retornos)
   */
  async getAdditionalFormQuestions(): Promise<FormQuestionsData> {
    const response = await api.get<FormQuestionsData>('/api/form-questions/additional');
    return response.data;
  },
};

export default api;

