import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/shared/Button';
import { queryKeys } from '@/config/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formQuestionsService } from '@/services/api';
import type { FormQuestion, FormQuestionCreatePayload, FormQuestionsData, ManagedFormKind } from '@/types';

const OPTION_BASED_TYPES = new Set<FormQuestion['type']>(['select', 'multiselect', 'radio', 'checkbox']);
const QUESTION_TYPE_HELP: Record<FormQuestion['type'], { label: string; description: string }> = {
  text: {
    label: 'Texto curto',
    description: 'Para respostas pequenas, como nome, profissão ou prontuário.',
  },
  textarea: {
    label: 'Texto longo',
    description: 'Para respostas maiores, como observações ou descrições detalhadas.',
  },
  number: {
    label: 'Número',
    description: 'Para valores numéricos, como peso, altura, idade ou quantidade.',
  },
  boolean: {
    label: 'Verdadeiro/Falso',
    description: 'Para respostas de sim ou não em formato técnico do sistema.',
  },
  select: {
    label: 'Lista única',
    description: 'Abre uma lista e a pessoa escolhe apenas uma opção.',
  },
  multiselect: {
    label: 'Lista múltipla',
    description: 'Abre uma lista e a pessoa pode escolher mais de uma opção.',
  },
  date: {
    label: 'Data',
    description: 'Para datas, como nascimento, coleta ou retorno.',
  },
  tel: {
    label: 'Telefone',
    description: 'Para números de telefone.',
  },
  radio: {
    label: 'Marcação única',
    description: 'Mostra opções visíveis na tela e a pessoa escolhe só uma.',
  },
  checkbox: {
    label: 'Marcação múltipla',
    description: 'Mostra opções visíveis na tela e a pessoa pode marcar várias.',
  },
};
const PROTECTED_QUESTION_IDS = new Set([
  'bmi',
  'height',
  'hormone_therapy_over_one_year',
  'patient_name',
  'using_hormone_therapy',
  'weight',
]);
const TYPE_OPTIONS: Array<{ value: FormQuestion['type']; label: string }> = [
  { value: 'text', label: QUESTION_TYPE_HELP.text.label },
  { value: 'textarea', label: QUESTION_TYPE_HELP.textarea.label },
  { value: 'number', label: QUESTION_TYPE_HELP.number.label },
  { value: 'boolean', label: QUESTION_TYPE_HELP.boolean.label },
  { value: 'select', label: QUESTION_TYPE_HELP.select.label },
  { value: 'multiselect', label: QUESTION_TYPE_HELP.multiselect.label },
  { value: 'date', label: QUESTION_TYPE_HELP.date.label },
  { value: 'tel', label: QUESTION_TYPE_HELP.tel.label },
  { value: 'radio', label: QUESTION_TYPE_HELP.radio.label },
  { value: 'checkbox', label: QUESTION_TYPE_HELP.checkbox.label },
];

const FIELD_HELP = {
  technicalId: {
    title: 'Como preencher o ID técnico',
    description: 'Use um nome interno curto, sem espaços, sem acentos e com underscore entre palavras.',
    example: 'Exemplo: pressao_arterial, uso_medicacao, data_exame',
  },
  placeholder: {
    title: 'Quando usar o placeholder',
    description: 'É um texto de exemplo dentro do campo para orientar o preenchimento.',
    example: 'Exemplo: Digite o número do prontuário',
  },
};

interface QuestionFormState {
  section_id: string;
  insert_after_question_id: string;
  id: string;
  label: string;
  type: FormQuestion['type'];
  required: boolean;
  readonly: boolean;
  allow_other: boolean;
  placeholder: string;
  optionsText: string;
  min: string;
  max: string;
  hasConditional: boolean;
  conditionalDependsOn: string;
  conditionalOperator: 'equals' | 'not_equals';
  conditionalValue: string;
}

interface EditingQuestionState {
  formKind: ManagedFormKind;
  sectionId: string;
  questionId: string;
}

interface QuestionPreviewState {
  sectionTitle: string;
  question: FormQuestion;
}

const EMPTY_FORM: QuestionFormState = {
  section_id: '',
  insert_after_question_id: '',
  id: '',
  label: '',
  type: 'text',
  required: false,
  readonly: false,
  allow_other: false,
  placeholder: '',
  optionsText: '',
  min: '',
  max: '',
  hasConditional: false,
  conditionalDependsOn: '',
  conditionalOperator: 'equals',
  conditionalValue: '',
};

const getDefinitionTitle = (formKind: ManagedFormKind, data?: FormQuestionsData) => {
  if (data?.form_name) return data.form_name;
  return formKind === 'standard' ? 'Formulário principal' : 'Formulário adicional';
};

const renderQuestionPreview = (question: FormQuestion) => {
  const options = question.options ?? [];

  switch (question.type) {
    case 'radio':
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <label key={`${question.id}-${option}-${index}`} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                {index === 0 && <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />}
              </div>
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
          {question.allow_other && (
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white" />
                <span className="text-sm text-gray-700">Outro:</span>
              </label>
              <div className="ml-8 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                Especifique...
              </div>
            </div>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <label key={`${question.id}-${option}-${index}`} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded border-2 border-gray-400 bg-white flex items-center justify-center">
                {index === 0 && (
                  <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
          {question.allow_other && (
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-3">
                <div className="w-5 h-5 rounded border-2 border-gray-400 bg-white" />
                <span className="text-sm text-gray-700">Outro:</span>
              </label>
              <div className="ml-8 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                Especifique...
              </div>
            </div>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-400 min-h-28">
          {question.placeholder || 'Resposta longa do usuário'}
        </div>
      );

    case 'select':
    case 'multiselect':
      return (
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 flex items-center justify-between">
            <span>{question.placeholder || 'Selecione uma opção'}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {options.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Opções disponíveis</p>
              <div className="flex flex-wrap gap-2">
                {options.map((option, index) => (
                  <span key={`${question.id}-${option}-${index}`} className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700">
                    {option}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-3">
          <div className="w-5 h-5 rounded border-2 border-gray-400 bg-white" />
          <span className="text-sm text-gray-700">Campo de verdadeiro/falso</span>
        </label>
      );

    case 'number':
    case 'text':
    case 'tel':
    case 'date':
    default:
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400">
          {question.placeholder || (
            question.type === 'date'
              ? 'dd/mm/aaaa'
              : question.type === 'number'
                ? 'Digite um número'
                : question.type === 'tel'
                  ? 'Digite um telefone'
                  : 'Resposta do usuário'
          )}
        </div>
      );
  }
};

export const FormSchemaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeFormKind, setActiveFormKind] = useState<ManagedFormKind>('standard');
  const [formState, setFormState] = useState<QuestionFormState>(EMPTY_FORM);
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestionState | null>(null);
  const [questionPreview, setQuestionPreview] = useState<QuestionPreviewState | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);

  const { data: standardQuestionsData, isLoading: isLoadingStandard } = useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.standard,
    queryFn: () => formQuestionsService.getFormQuestions(),
  });

  const { data: additionalQuestionsData, isLoading: isLoadingAdditional } = useQuery<FormQuestionsData>({
    queryKey: queryKeys.formQuestions.additional,
    queryFn: () => formQuestionsService.getAdditionalFormQuestions(),
  });

  const activeDefinition = activeFormKind === 'standard' ? standardQuestionsData : additionalQuestionsData;
  const isLoading = isLoadingStandard || isLoadingAdditional;

  const allQuestions = useMemo(
    () => [standardQuestionsData, additionalQuestionsData]
      .filter(Boolean)
      .flatMap((definition) => definition!.sections.flatMap((section) => section.questions)),
    [standardQuestionsData, additionalQuestionsData]
  );

  const selectedSection = activeDefinition?.sections.find((section) => section.id === formState.section_id)
    ?? activeDefinition?.sections[0];

  const sectionQuestions = selectedSection?.questions ?? [];
  const conditionalDependencyQuestion = allQuestions.find((question) => question.id === formState.conditionalDependsOn);
  const selectedTypeHelp = QUESTION_TYPE_HELP[formState.type];
  const previewOptions = formState.optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);

  useEffect(() => {
    if (!activeDefinition?.sections.length) return;

    setFormState((prev) => {
      const nextSectionId = activeDefinition.sections.some((section) => section.id === prev.section_id)
        ? prev.section_id
        : activeDefinition.sections[0].id;

      const nextSection = activeDefinition.sections.find((section) => section.id === nextSectionId) ?? activeDefinition.sections[0];
      const hasInsertTarget = nextSection.questions.some((question) => question.id === prev.insert_after_question_id);

      return {
        ...prev,
        section_id: nextSectionId,
        insert_after_question_id: hasInsertTarget ? prev.insert_after_question_id : '',
      };
    });
  }, [activeDefinition]);

  useEffect(() => {
    setEditingQuestion(null);
    setFormState((prev) => ({
      ...EMPTY_FORM,
      section_id: activeDefinition?.sections[0]?.id || prev.section_id || '',
    }));
  }, [activeFormKind, activeDefinition?.sections]);

  const resetForm = () => {
    setFormState((prev) => ({
      ...EMPTY_FORM,
      section_id: prev.section_id || activeDefinition?.sections[0]?.id || '',
    }));
  };

  const invalidateQuestions = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.formQuestions.all });
  };

  const addQuestionMutation = useMutation({
    mutationFn: async (payload: FormQuestionCreatePayload) => formQuestionsService.addQuestion(activeFormKind, payload),
    onSuccess: async () => {
      await invalidateQuestions();
      resetForm();
      showToast('Pergunta adicionada com sucesso.', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Erro ao adicionar pergunta.', 'error');
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, payload }: { questionId: string; payload: FormQuestionCreatePayload }) =>
      formQuestionsService.updateQuestion(activeFormKind, questionId, payload),
    onSuccess: async () => {
      await invalidateQuestions();
      setEditingQuestion(null);
      resetForm();
      showToast('Pergunta atualizada com sucesso.', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Erro ao atualizar pergunta.', 'error');
    },
  });

  const removeQuestionMutation = useMutation({
    mutationFn: async ({ formKind, questionId }: { formKind: ManagedFormKind; questionId: string }) =>
      formQuestionsService.removeQuestion(formKind, questionId),
    onSuccess: async () => {
      await invalidateQuestions();
      showToast('Pergunta removida com sucesso.', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Erro ao remover pergunta.', 'error');
    },
  });

  const handleInputChange = <K extends keyof QuestionFormState>(key: K, value: QuestionFormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const buildQuestionPayload = (): FormQuestionCreatePayload | null => {
    const trimmedId = formState.id.trim();
    const trimmedLabel = formState.label.trim();

    if (!trimmedId || !trimmedLabel) {
      showToast('ID e rótulo da pergunta são obrigatórios.', 'warning');
      return null;
    }

    const payload: FormQuestionCreatePayload = {
      section_id: formState.section_id,
      question: {
        id: trimmedId,
        label: trimmedLabel,
        type: formState.type,
        required: formState.required,
        readonly: formState.readonly,
      },
    };

    if (formState.insert_after_question_id) {
      payload.insert_after_question_id = formState.insert_after_question_id;
    }

    if (formState.placeholder.trim()) {
      payload.question.placeholder = formState.placeholder.trim();
    }

    if (OPTION_BASED_TYPES.has(formState.type)) {
      const options = formState.optionsText
        .split('\n')
        .map((option) => option.trim())
        .filter(Boolean);

      if (options.length === 0) {
        showToast('Perguntas com opções precisam de ao menos uma opção.', 'warning');
        return null;
      }

      payload.question.options = options;
      payload.question.allow_other = formState.allow_other;
    }

    if (formState.type === 'number') {
      if (formState.min.trim()) {
        payload.question.min = Number(formState.min);
      }
      if (formState.max.trim()) {
        payload.question.max = Number(formState.max);
      }
    }

    if (formState.hasConditional) {
      if (!formState.conditionalDependsOn.trim() || !formState.conditionalValue.trim()) {
        showToast('Preencha a regra condicional antes de salvar.', 'warning');
        return null;
      }

      const conditionValue = conditionalDependencyQuestion?.type === 'boolean'
        ? formState.conditionalValue === 'true'
        : formState.conditionalValue.trim();

      payload.question.conditional = {
        depends_on: formState.conditionalDependsOn.trim(),
        ...(formState.conditionalOperator === 'equals'
          ? { value: conditionValue }
          : { value_not: String(conditionValue) }),
      };
    }

    return payload;
  };

  const loadQuestionIntoForm = (sectionId: string, question: FormQuestion) => {
    const conditionalValue = typeof question.conditional?.value === 'boolean'
      ? String(question.conditional.value)
      : typeof question.conditional?.value === 'string'
        ? question.conditional.value
        : question.conditional?.value_not ?? '';

    setFormState({
      section_id: sectionId,
      insert_after_question_id: '',
      id: question.id,
      label: question.label,
      type: question.type,
      required: Boolean(question.required),
      readonly: Boolean(question.readonly),
      allow_other: Boolean(question.allow_other),
      placeholder: question.placeholder ?? '',
      optionsText: question.options?.join('\n') ?? '',
      min: question.min != null ? String(question.min) : '',
      max: question.max != null ? String(question.max) : '',
      hasConditional: Boolean(question.conditional),
      conditionalDependsOn: question.conditional?.depends_on ?? '',
      conditionalOperator: question.conditional?.value_not !== undefined ? 'not_equals' : 'equals',
      conditionalValue,
    });
    setEditingQuestion({
      formKind: activeFormKind,
      sectionId,
      questionId: question.id,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeDefinition) {
      showToast('As definições do formulário ainda não carregaram.', 'warning');
      return;
    }

    const payload = buildQuestionPayload();
    if (!payload) return;

    if (editingQuestion) {
      updateQuestionMutation.mutate({
        questionId: editingQuestion.questionId,
        payload,
      });
      return;
    }

    addQuestionMutation.mutate(payload);
  };

  const handleDelete = (questionId: string) => {
    if (!window.confirm(`Remover a pergunta "${questionId}"? Essa ação altera o formulário imediatamente.`)) {
      return;
    }

    removeQuestionMutation.mutate({ formKind: activeFormKind, questionId });
  };

  const isSaving = addQuestionMutation.isPending || updateQuestionMutation.isPending;

  if (!user?.is_form_admin) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Permissão Necessária</h1>
          <p className="text-gray-600">
            Esta área é restrita aos usuários definidos em <code>FORM_SCHEMA_ADMIN_USERS</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Perguntas do Formulário</h1>
          <p className="text-gray-500 text-lg">
            Adicione, edite ou remova perguntas sem alterar a estrutura principal do sistema.
          </p>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            {(['standard', 'additional'] as ManagedFormKind[]).map((formKind) => {
              const definition = formKind === 'standard' ? standardQuestionsData : additionalQuestionsData;
              const isActive = activeFormKind === formKind;
              return (
                <button
                  key={formKind}
                  type="button"
                  onClick={() => setActiveFormKind(formKind)}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {getDefinitionTitle(formKind, definition)}
                </button>
              );
            })}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFullPreviewOpen(true)}
              disabled={!activeDefinition || isLoading}
            >
              Ver preview completo
            </Button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr,1.35fr]">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {editingQuestion
                ? 'Altere os campos necessários e salve. O ID técnico permanece fixo para não quebrar referências.'
                : 'Preencha os campos abaixo para incluir uma nova pergunta na seção escolhida.'}
            </p>

            {isLoading || !activeDefinition ? (
              <p className="text-gray-500">Carregando definições...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seção</label>
                  <select
                    value={formState.section_id}
                    onChange={(e) => handleInputChange('section_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/20 focus:border-[#4A6FA5]"
                  >
                    {activeDefinition.sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inserir após</label>
                  <select
                    value={formState.insert_after_question_id}
                    onChange={(e) => handleInputChange('insert_after_question_id', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4A6FA5]/20 focus:border-[#4A6FA5]"
                  >
                    <option value="">Final da seção</option>
                    {sectionQuestions.map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <label className="block text-sm font-medium text-gray-700">ID técnico</label>
                      <div className="relative group">
                        <button
                          type="button"
                          aria-label="Explicação sobre o ID técnico"
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-500 cursor-help"
                        >
                          !
                        </button>
                        <div className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-lg group-hover:block group-focus-within:block">
                          <p className="text-sm font-semibold text-gray-900 mb-2">{FIELD_HELP.technicalId.title}</p>
                          <p className="text-sm text-gray-600">{FIELD_HELP.technicalId.description}</p>
                          <p className="mt-2 text-sm text-gray-500">{FIELD_HELP.technicalId.example}</p>
                        </div>
                      </div>
                    </div>
                    <input
                      value={formState.id}
                      onChange={(e) => handleInputChange('id', e.target.value)}
                      placeholder="ex: new_question_id"
                      disabled={Boolean(editingQuestion)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {editingQuestion
                        ? 'O ID técnico não pode ser alterado depois que a pergunta é criada.'
                        : <>Use apenas letras minúsculas, números e <code>_</code>.</>}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <label className="block text-sm font-medium text-gray-700">Tipo</label>
                      <div className="relative group">
                        <button
                          type="button"
                          aria-label="Explicação sobre os tipos de pergunta"
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-500 cursor-help"
                        >
                          !
                        </button>
                        <div className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-80 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-lg group-hover:block group-focus-within:block">
                          <p className="text-sm font-semibold text-gray-900 mb-2">Como escolher o tipo</p>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {Object.entries(QUESTION_TYPE_HELP).map(([type, help]) => (
                              <li key={type}>
                                <span className="font-medium text-gray-900">{help.label}:</span> {help.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <select
                      value={formState.type}
                      onChange={(e) => handleInputChange('type', e.target.value as FormQuestion['type'])}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    >
                      {TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{selectedTypeHelp.label}:</span> {selectedTypeHelp.description}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rótulo</label>
                  <input
                    value={formState.label}
                    onChange={(e) => handleInputChange('label', e.target.value)}
                    placeholder="Texto que será exibido para o usuário"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <label className="block text-sm font-medium text-gray-700">Placeholder</label>
                    <div className="relative group">
                      <button
                        type="button"
                        aria-label="Explicação sobre o placeholder"
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-500 cursor-help"
                      >
                        !
                      </button>
                      <div className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-lg group-hover:block group-focus-within:block">
                        <p className="text-sm font-semibold text-gray-900 mb-2">{FIELD_HELP.placeholder.title}</p>
                        <p className="text-sm text-gray-600">{FIELD_HELP.placeholder.description}</p>
                        <p className="mt-2 text-sm text-gray-500">{FIELD_HELP.placeholder.example}</p>
                      </div>
                    </div>
                  </div>
                  <input
                    value={formState.placeholder}
                    onChange={(e) => handleInputChange('placeholder', e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Texto de exemplo que aparece dentro do campo antes de preencher.
                  </p>
                </div>

                {OPTION_BASED_TYPES.has(formState.type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opções</label>
                    <textarea
                      value={formState.optionsText}
                      onChange={(e) => handleInputChange('optionsText', e.target.value)}
                      rows={5}
                      placeholder={'Uma opção por linha'}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                    />
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Prévia visual</p>
                      <div className="space-y-3">
                        {(previewOptions.length > 0 ? previewOptions : ['Exemplo de opção']).map((option, index) => (
                          <div key={`${option}-${index}`} className="flex items-center space-x-3">
                            {formState.type === 'radio' ? (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                                {index === 0 && <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />}
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-gray-400 bg-white flex items-center justify-center">
                                {index === 0 && (
                                  <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            )}
                            <span className="text-sm text-gray-700">{option}</span>
                          </div>
                        ))}
                        {formState.allow_other && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center space-x-3">
                              {formState.type === 'radio' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white" />
                              ) : (
                                <div className="w-5 h-5 rounded border-2 border-gray-400 bg-white" />
                              )}
                              <span className="text-sm text-gray-700">Outro:</span>
                            </div>
                            <div className="ml-8 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                              Especifique...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formState.type === 'number' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mínimo</label>
                      <input
                        type="number"
                        value={formState.min}
                        onChange={(e) => handleInputChange('min', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Máximo</label>
                      <input
                        type="number"
                        value={formState.max}
                        onChange={(e) => handleInputChange('max', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={formState.required}
                      onChange={(e) => handleInputChange('required', e.target.checked)}
                    />
                    Obrigatória
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={formState.readonly}
                      onChange={(e) => handleInputChange('readonly', e.target.checked)}
                    />
                    Somente leitura
                  </label>

                  {OPTION_BASED_TYPES.has(formState.type) && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={formState.allow_other}
                        onChange={(e) => handleInputChange('allow_other', e.target.checked)}
                      />
                      Permitir "Outro"
                    </label>
                  )}
                </div>

                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.hasConditional}
                      onChange={(e) => handleInputChange('hasConditional', e.target.checked)}
                    />
                    Adicionar regra condicional
                  </label>

                  {formState.hasConditional && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Depende da pergunta</label>
                        <select
                          value={formState.conditionalDependsOn}
                          onChange={(e) => handleInputChange('conditionalDependsOn', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        >
                          <option value="">Selecione</option>
                          {allQuestions.map((question) => (
                            <option key={question.id} value={question.id}>
                              {question.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[180px,1fr]">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Operador</label>
                          <select
                            value={formState.conditionalOperator}
                            onChange={(e) => handleInputChange('conditionalOperator', e.target.value as 'equals' | 'not_equals')}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                          >
                            <option value="equals">Igual a</option>
                            <option value="not_equals">Diferente de</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Valor esperado</label>
                          {conditionalDependencyQuestion?.type === 'boolean' ? (
                            <select
                              value={formState.conditionalValue}
                              onChange={(e) => handleInputChange('conditionalValue', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                            >
                              <option value="">Selecione</option>
                              <option value="true">Verdadeiro</option>
                              <option value="false">Falso</option>
                            </select>
                          ) : (
                            <input
                              value={formState.conditionalValue}
                              onChange={(e) => handleInputChange('conditionalValue', e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                            />
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" variant="secondary" isLoading={isSaving}>
                    {editingQuestion ? 'Salvar alterações' : 'Adicionar pergunta'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingQuestion(null);
                      resetForm();
                    }}
                  >
                    {editingQuestion ? 'Cancelar edição' : 'Limpar'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Perguntas Atuais</h2>
                <p className="text-sm text-gray-500">
                  Remoções são bloqueadas para perguntas críticas ou dependidas por outras regras.
                </p>
              </div>
            </div>

            {isLoading || !activeDefinition ? (
              <p className="text-gray-500">Carregando perguntas...</p>
            ) : (
              <div className="space-y-6">
                {activeDefinition.sections.map((section) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{section.id}</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {section.questions.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-gray-500">Nenhuma pergunta nesta seção.</div>
                      ) : section.questions.map((question) => {
                        const isProtected = PROTECTED_QUESTION_IDS.has(question.id);
                        return (
                          <div key={question.id} className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between hover:bg-gray-50/70 transition-colors">
                            <button
                              type="button"
                              onClick={() => setQuestionPreview({ sectionTitle: section.title, question })}
                              className="flex-1 text-left"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">{question.label}</h4>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                                  {QUESTION_TYPE_HELP[question.type].label}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                  {question.id}
                                </span>
                                {isProtected && (
                                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                    protegida
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                {question.required && <p>Obrigatória</p>}
                                {question.options && question.options.length > 0 && (
                                  <p>{question.options.length} opção(ões)</p>
                                )}
                                {question.conditional && (
                                  <p>Condicional em {question.conditional.depends_on}</p>
                                )}
                              </div>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => loadQuestionIntoForm(section.id, question)}
                                onMouseDown={(e) => e.stopPropagation()}
                                disabled={isSaving || removeQuestionMutation.isPending}
                                title="Editar pergunta"
                                aria-label={`Editar ${question.label}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 16.536a4 4 0 01-1.414.943L7 19l1.521-4.122A4 4 0 019.0 13z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(question.id)}
                                onMouseDown={(e) => e.stopPropagation()}
                                disabled={removeQuestionMutation.isPending || isSaving || isProtected}
                                title={isProtected ? 'Pergunta protegida' : 'Remover pergunta'}
                                aria-label={`Remover ${question.label}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7m3 0V4a1 1 0 011-1h6a1 1 0 011 1v3m-9 0h10" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {questionPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setQuestionPreview(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">{questionPreview.sectionTitle}</p>
                <h3 className="text-xl font-semibold text-gray-900">Preview da Pergunta</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuestionPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar preview da pergunta"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {QUESTION_TYPE_HELP[questionPreview.question.type].label}
                </span>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                  {questionPreview.question.id}
                </span>
                {questionPreview.question.required && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                    obrigatória
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-base font-medium text-gray-900">
                  {questionPreview.question.label}
                  {questionPreview.question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestionPreview(questionPreview.question)}
                {questionPreview.question.conditional && (
                  <p className="text-sm text-gray-500">
                    Exibida quando <span className="font-medium">{questionPreview.question.conditional.depends_on}</span>{' '}
                    {questionPreview.question.conditional.value_not !== undefined ? 'for diferente de' : 'for igual a'}{' '}
                    <span className="font-medium">
                      {String(questionPreview.question.conditional.value ?? questionPreview.question.conditional.value_not)}
                    </span>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isFullPreviewOpen && activeDefinition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setIsFullPreviewOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Prévia completa</p>
                <h3 className="text-xl font-semibold text-gray-900">{getDefinitionTitle(activeFormKind, activeDefinition)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFullPreviewOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar preview completo"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-6 space-y-8">
              {activeDefinition.sections.map((section) => (
                <section key={section.id} className="space-y-4">
                  <div className="border-b border-gray-200 pb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
                  </div>

                  <div className="space-y-6">
                    {section.questions.map((question) => (
                      <div key={question.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200">
                            {QUESTION_TYPE_HELP[question.type].label}
                          </span>
                          {question.required && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200">
                              obrigatória
                            </span>
                          )}
                        </div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          {question.label}
                          {question.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderQuestionPreview(question)}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
