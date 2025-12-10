/**
 * Hook para gerenciar cache persistente das perguntas do formulário.
 * Usa localStorage para persistir entre sessões e valida versão.
 */

import { useQuery } from '@tanstack/react-query';
import { formQuestionsService } from '@/services/api';
import { queryKeys } from '@/config/queryKeys';
import type { FormQuestionsData } from '@/types';

const CACHE_KEY = 'form_questions_cache';
const CACHE_VERSION_KEY = 'form_questions_version';

interface CachedData {
  data: FormQuestionsData;
  timestamp: number;
  version: string;
}

/**
 * Obtém dados do cache do localStorage
 */
const getCachedData = (): CachedData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const parsed: CachedData = JSON.parse(cached);
    const now = Date.now();
    const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 horas
    
    // Verifica se o cache expirou
    if (now - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_VERSION_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Salva dados no cache do localStorage
 */
const setCachedData = (data: FormQuestionsData) => {
  try {
    const cached: CachedData = {
      data,
      timestamp: Date.now(),
      version: data.version || 'unknown',
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    localStorage.setItem(CACHE_VERSION_KEY, data.version || 'unknown');
  } catch (error) {
    console.warn('Erro ao salvar cache:', error);
  }
};

/**
 * Verifica se a versão do cache é diferente da versão atual
 */
const isCacheOutdated = (currentVersion: string): boolean => {
  const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
  const isOutdated = cachedVersion !== currentVersion;
  // Se está desatualizado, limpa o cache imediatamente
  if (isOutdated && cachedVersion) {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  }
  return isOutdated;
};

/**
 * Hook para buscar perguntas do formulário com cache persistente
 */
export const useFormQuestionsCache = () => {
  return useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.standard,
    queryFn: async () => {
      // Limpa cache antigo antes de buscar
      const cached = getCachedData();
      
      // Busca do servidor
      const data = await formQuestionsService.getFormQuestions();
      
      // Se a versão mudou, limpa o cache antigo
      if (cached && cached.data.version !== data.version) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
      }
      
      // Sempre salva a versão mais recente
      setCachedData(data);
      
      return data;
    },
    // Cache mais agressivo no React Query também, mas mantém verificação de versão
    staleTime: 1000 * 60 * 10, // 10 minutos - form questions mudam raramente
    gcTime: 1000 * 60 * 30, // 30 minutos em cache no React Query
    // Mantém verificação de versão mas não força refetch sempre
    refetchOnMount: false, // Usa cache se disponível
    refetchOnWindowFocus: false, // Não refaz fetch ao focar (já tem cache inteligente)
  });
};

