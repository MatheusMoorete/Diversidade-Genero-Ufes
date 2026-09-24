import type { FormQuestionsData } from '@/types';

export const ANTHROPOMETRY_FORM_TYPE = 'anthropometry';

export const anthropometryQuestions: FormQuestionsData = {
  version: '1.0',
  last_updated: '2026-09-23',
  form_type: ANTHROPOMETRY_FORM_TYPE,
  form_name: 'Antropometria, composição corporal e força muscular',
  sections: [
    {
      id: 'collection', title: 'Identificação da coleta', questions: [
        { id: 'patient_name', label: 'Nome completo', type: 'text', required: true },
        { id: 'participant_id', label: 'ID do participante (001 a 100)', type: 'text', required: true, max_length: 3, pattern: '(?:00[1-9]|0[1-9][0-9]|100)', input_mode: 'numeric' },
      ],
    },
    {
      id: 'screening', title: '1. Triagem e elegibilidade', questions: [
        { id: 'participant_group', label: 'Grupo', type: 'radio', options: ['Homem trans', 'Mulher cisgênero'], required: true },
        { id: 'age', label: 'Idade (anos)', type: 'text', required: true, max_length: 2, pattern: '(?:1[89]|[2-5][0-9]|60)', input_mode: 'numeric' },
      ],
    },
    {
      id: 'clinical', title: '2. Caracterização clínica', questions: [
        { id: 'hypertension', label: 'Hipertensão arterial', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'diabetes', label: 'Diabetes mellitus', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'dyslipidemia', label: 'Dislipidemia', type: 'radio', options: ['Não', 'Sim'] },
      ],
    },
    {
      id: 'physical_activity', title: '3. Atividade física', questions: [
        { id: 'physical_activity', label: 'Pratica atividade física?', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'activity_days_week', label: 'Frequência (dias/semana)', type: 'number', min: 0, max: 7, conditional: { depends_on: 'physical_activity', value: 'Sim' } },
        { id: 'activity_minutes_session', label: 'Duração média por sessão (minutos)', type: 'number', min: 0, conditional: { depends_on: 'physical_activity', value: 'Sim' } },
        { id: 'activity_type', label: 'Tipo principal', type: 'radio', options: ['Musculação/força', 'Caminhada', 'Corrida', 'Ciclismo', 'Esporte'], allow_other: true, conditional: { depends_on: 'physical_activity', value: 'Sim' } },
        { id: 'additional_activities', label: 'Outras atividades', type: 'textarea', conditional: { depends_on: 'physical_activity', value: 'Sim' } },
      ],
    },
    {
      id: 'smoking', title: '4. Tabagismo', questions: [
        { id: 'current_smoking', label: 'Tabagismo atual', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'cigarettes_day', label: 'Cigarros por dia', type: 'number', min: 0, conditional: { depends_on: 'current_smoking', value: 'Sim' } },
        { id: 'smoking_years', label: 'Tempo de tabagismo (anos)', type: 'number', min: 0, conditional: { depends_on: 'current_smoking', value: 'Sim' } },
        { id: 'pack_years', label: 'Carga tabágica (maços-ano)', type: 'number', min: 0, conditional: { depends_on: 'current_smoking', value: 'Sim' } },
        { id: 'pack_years_classification', label: 'Classificação da carga tabágica', type: 'radio', options: ['< 20 maços-ano', '≥ 20 maços-ano'], conditional: { depends_on: 'current_smoking', value: 'Sim' } },
      ],
    },
    {
      id: 'medications', title: '5. Medicamentos', questions: [
        { id: 'continuous_medication', label: 'Usa medicamentos continuamente?', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'medications_description', label: 'Medicamentos, doses, frequências e tempo de uso', type: 'textarea', conditional: { depends_on: 'continuous_medication', value: 'Sim' } },
        { id: 'medication_body_composition_impact', label: 'Possível impacto sobre composição corporal', type: 'radio', options: ['Não', 'Sim', 'A avaliar'], conditional: { depends_on: 'continuous_medication', value: 'Sim' } },
      ],
    },
    {
      id: 'circumferences',
      title: '6. Circunferências',
      description: 'Fita antropométrica inelástica. Participante em ortostatismo. Fita horizontal e ajustada sem comprimir. Fazer 2 medidas; se a diferença for maior que 0,5 cm, fazer a 3ª e usar a média das duas medidas mais próximas.',
      questions: [
        ...['Cervical', 'Cintura/abdominal', 'Quadril'].flatMap((label, index) => {
          const id = ['neck', 'waist', 'hip'][index];
          const guidelines = [
            'Diretriz: cabeça neutra/plano de Frankfurt; fita horizontal ao nível da região cricotireóidea.',
            'Diretriz: ponto médio entre a margem inferior da última costela palpável e a borda superior da crista ilíaca; leitura ao final de expiração normal.',
            'Diretriz: maior circunferência das nádegas.',
          ];
          return [
            { id: `${id}_circumference_1`, label: `${label} — 1ª medida (cm)`, type: 'number' as const, min: 0, helper_text: guidelines[index] },
            { id: `${id}_circumference_2`, label: `${label} — 2ª medida (cm)`, type: 'number' as const, min: 0, helper_text: guidelines[index] },
            { id: `${id}_circumference_3`, label: `${label} — 3ª medida, se necessária (cm)`, type: 'number' as const, min: 0, helper_text: guidelines[index] },
            { id: `${id}_circumference_final`, label: `${label} — valor final (cm)`, type: 'number' as const, min: 0, helper_text: guidelines[index] },
          ];
        }),
        { id: 'waist_hip_ratio', label: 'RCQ (cintura ÷ quadril)', type: 'number', min: 0 },
      ],
    },
    {
      id: 'blood_pressure', title: '7. Pressão arterial', questions: [
        { id: 'systolic_pressure', label: 'PAS (mmHg)', type: 'number', min: 0 },
        { id: 'diastolic_pressure', label: 'PAD (mmHg)', type: 'number', min: 0 },
      ],
    },
    {
      id: 'hormone_therapy', title: '8. Hormonioterapia — somente homens trans', questions: [
        { id: 'testosterone_months', label: 'Tempo total de uso de testosterona (meses)', type: 'number', min: 0, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_type', label: 'Preparação/tipo', type: 'text', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_route', label: 'Via', type: 'radio', options: ['Intramuscular', 'Subcutânea', 'Transdérmica'], allow_other: true, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_dose', label: 'Dose', type: 'number', min: 0, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_interval', label: 'Intervalo entre administrações (dias/semanas)', type: 'text', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'last_testosterone_dose', label: 'Data aproximada da última dose', type: 'date', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'hormone_therapy_notes', label: 'Observações', type: 'textarea', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
      ],
    },
    {
      id: 'body_composition', title: '9. Bioimpedância — composição corporal', questions: [
        { id: 'bioimpedance_configuration', label: 'Configuração utilizada', type: 'radio', options: ['Masculina', 'Feminina'] },
        { id: 'weight', label: 'Peso (kg)', type: 'number', min: 0 },
        { id: 'height', label: 'Altura (cm)', type: 'number', min: 0 },
        { id: 'bmi', label: 'IMC calculado (kg/m²)', type: 'number', readonly: true, calculated: { formula: 'weight / (height / 100)²', depends_on: ['weight', 'height'] } },
        ...[
          ['total_body_water_l', 'Água corporal total (L)'], ['total_body_water_percent', 'Água corporal total (%)'], ['protein_mass', 'Massa proteica (kg)'], ['mineral_mass', 'Massa mineral (kg)'], ['muscle_mass', 'Massa muscular (kg)'], ['skeletal_muscle_mass', 'Massa muscular esquelética (kg)'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const, min: 0 })),
        { id: 'body_fat_mass', label: 'Massa gorda corporal (kg)', type: 'number', min: 0 },
        { id: 'fat_free_mass', label: 'Massa livre corporal (kg)', type: 'number', min: 0, readonly: true, calculated: { formula: 'weight - body_fat_mass', depends_on: ['weight', 'body_fat_mass'] } },
        ...[
          ['body_fat_percent', 'Percentual de gordura corporal (%)'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const, min: 0 })),
        { id: 'visceral_fat_level', label: 'Nível de gordura visceral', type: 'select', options: ['Baixo', 'Alto', 'Muito alto'] },
        ...[
          ['abdominal_fat_index', 'Índice de gordura abdominal'], ['obesity_degree', 'Grau de obesidade (%)'], ['basal_metabolic_rate', 'Taxa metabólica basal (kcal)'], ['total_energy_expenditure', 'Gasto energético total (kcal)'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const, min: 0 })),
      ],
    },
    {
      id: 'segmental_analysis', title: '10. Análise segmentar', questions: [
        ...['Braço esquerdo', 'Braço direito', 'Tronco', 'Perna esquerda', 'Perna direita'].flatMap((label, index) => {
          const id = ['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'][index];
          return [
            { id: `${id}_muscle_mass`, label: `${label} — massa muscular (kg)`, type: 'number' as const, min: 0 },
            { id: `${id}_fat_mass`, label: `${label} — massa gorda (kg)`, type: 'number' as const, min: 0 },
          ];
        }),
      ],
    },
    {
      id: 'segmental_impedance', title: '11. Impedância segmentar', questions: [
        ...['10 kHz', '100 kHz'].flatMap((frequency) =>
          [['la', 'Braço E.'], ['ra', 'Braço D.'], ['tr', 'Tronco'], ['ll', 'Perna E.'], ['rl', 'Perna D.']].map(([segment, label]) => ({
            id: `impedance_${frequency.startsWith('10 ') ? '10' : '100'}_${segment}`,
            label: `${frequency} — ${label}`,
            type: 'number' as const,
            min: 0,
          })),
        ),
      ],
    },
    {
      id: 'mediana_additional', title: '12. Dados adicionais fornecidos pelo Mediana', questions: [
        ...[
          ['ideal_weight', 'Peso ideal/desejável (kg)'], ['ideal_muscle_mass', 'Massa muscular ideal (kg)'], ['ideal_fat_mass', 'Massa gorda ideal (kg)'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const })),
      ],
    },
    {
      id: 'dynamometry',
      title: '13. Dinamometria manual',
      description: 'Posição: sentado, ombro aduzido, cotovelo a 90°, antebraço neutro e punho confortável. Ordem: mão dominante → não dominante. Três tentativas por mão, com 1 minuto de repouso. Usar o maior valor.',
      questions: [
        { id: 'dominant_hand', label: 'Mão dominante', type: 'radio', options: ['Direita', 'Esquerda', 'Ambidestra'] },
        ...['Dominante', 'Não dominante'].flatMap((label, index) => {
          const id = index === 0 ? 'dominant' : 'non_dominant';
          return [1, 2, 3].map((attempt) => ({ id: `${id}_hand_attempt_${attempt}`, label: `${label} — ${attempt}ª tentativa (kg)`, type: 'number' as const, min: 0 }))
            .concat([{ id: `${id}_hand_max`, label: `${label} — maior valor (kg)`, type: 'number' as const, min: 0 }]);
        }),
      ],
    },
  ],
};
