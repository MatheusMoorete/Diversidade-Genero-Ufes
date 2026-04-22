import type { FormQuestionsData } from '@/types';

const RETURN_HIDDEN_SECTION_IDS = new Set([
  'hormone_therapy_objectives',
]);

export const getReturnQuestionsData = (
  additionalQuestionsData: FormQuestionsData | undefined,
  standardQuestionsData?: FormQuestionsData
): FormQuestionsData | null => {
  if (!additionalQuestionsData) return null;

  const mentalHealthSection = standardQuestionsData?.sections.find(
    (section) => section.id === 'mental_health'
  );

  return {
    ...additionalQuestionsData,
    sections: [
      ...(mentalHealthSection ? [mentalHealthSection] : []),
      ...additionalQuestionsData.sections.filter(
        (section) => !RETURN_HIDDEN_SECTION_IDS.has(section.id)
      ),
    ],
  };
};
