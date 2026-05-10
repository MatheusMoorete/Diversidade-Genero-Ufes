/**
 * Hook para buscar perguntas do formulario usando apenas o cache em memoria
 * do TanStack Query. Nao persiste schema nem respostas no localStorage.
 */

import { useQuery } from '@tanstack/react-query';
import { formQuestionsService } from '@/services/api';
import { queryKeys } from '@/config/queryKeys';
import type { FormQuestionsData } from '@/types';

export const useFormQuestionsCache = () => {
  return useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.standard,
    queryFn: () => formQuestionsService.getFormQuestions(),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
