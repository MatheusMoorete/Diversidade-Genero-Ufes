/**
 * Estrutura centralizada de Query Keys para React Query.
 * Garante consistência e facilita invalidação de cache.
 */

export const queryKeys = {
  // Form Questions
  formQuestions: {
    standard: ['formQuestions', 'standard'] as const,
    additional: ['formQuestions', 'additional'] as const,
    all: ['formQuestions'] as const,
  },
  
  // Patients
  patients: {
    all: ['patients'] as const,
    lists: () => [...queryKeys.patients.all, 'list'] as const,
    list: (filters: { search?: string; orderBy?: string; page?: number }) => 
      [...queryKeys.patients.lists(), filters] as const,
    details: () => [...queryKeys.patients.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.patients.details(), id] as const,
  },
  
  // Form Responses
  formResponses: {
    all: ['formResponses'] as const,
    byPatient: (patientId: number) => 
      [...queryKeys.formResponses.all, 'patient', patientId] as const,
    upcomingReturns: (days?: number) => 
      [...queryKeys.formResponses.all, 'upcoming-returns', days ?? 15] as const,
    detail: (id: number) => 
      [...queryKeys.formResponses.all, 'detail', id] as const,
  },

  backup: {
    all: ['backup'] as const,
    neonStatus: () => [...queryKeys.backup.all, 'neon-status'] as const,
  },
} as const;
