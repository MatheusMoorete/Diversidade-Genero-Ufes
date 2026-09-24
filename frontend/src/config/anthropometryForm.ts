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
      id: 'anthropometry', title: '6. Antropometria', questions: [
        { id: 'weight', label: 'Peso — Mediana i20 (kg)', type: 'number', min: 0 },
        { id: 'height', label: 'Altura — estadiômetro (cm)', type: 'number', min: 0 },
        { id: 'bmi', label: 'IMC calculado (kg/m²)', type: 'number', readonly: true, calculated: { formula: 'weight / (height / 100)²', depends_on: ['weight', 'height'] } },
      ],
    },
    {
      id: 'circumferences', title: '7. Circunferências', questions: [
        ...['Cervical', 'Cintura/abdominal', 'Quadril'].flatMap((label, index) => {
          const id = ['neck', 'waist', 'hip'][index];
          return [
            { id: `${id}_circumference_1`, label: `${label} — 1ª medida (cm)`, type: 'number' as const, min: 0 },
            { id: `${id}_circumference_2`, label: `${label} — 2ª medida (cm)`, type: 'number' as const, min: 0 },
            { id: `${id}_circumference_3`, label: `${label} — 3ª medida, se necessária (cm)`, type: 'number' as const, min: 0 },
            { id: `${id}_circumference_final`, label: `${label} — valor final (cm)`, type: 'number' as const, min: 0 },
          ];
        }),
        { id: 'waist_hip_ratio', label: 'RCQ (cintura ÷ quadril)', type: 'number', min: 0 },
      ],
    },
    {
      id: 'blood_pressure', title: '8. Pressão arterial', questions: [
        { id: 'systolic_pressure', label: 'PAS (mmHg)', type: 'number', min: 0 },
        { id: 'diastolic_pressure', label: 'PAD (mmHg)', type: 'number', min: 0 },
        { id: 'blood_pressure_notes', label: 'Observação', type: 'textarea' },
      ],
    },
    {
      id: 'hormone_therapy', title: '9. Hormonioterapia — somente homens trans', questions: [
        { id: 'testosterone_months', label: 'Tempo total de uso de testosterona (meses)', type: 'number', min: 0, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_type', label: 'Preparação/tipo', type: 'text', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_route', label: 'Via', type: 'radio', options: ['Intramuscular', 'Subcutânea', 'Transdérmica'], allow_other: true, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_dose', label: 'Dose', type: 'number', min: 0, conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_unit', label: 'Unidade', type: 'text', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'testosterone_interval', label: 'Intervalo entre administrações (dias/semanas)', type: 'text', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'last_testosterone_dose', label: 'Data aproximada da última dose', type: 'date', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'hormone_therapy_notes', label: 'Observações', type: 'textarea', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
      ],
    },
    {
      id: 'bioimpedance_checklist', title: '10. Bioimpedância — checklist pré-exame', questions: [
        { id: 'bioimpedance_preparation', label: 'Condições confirmadas', type: 'checkbox', options: ['≥ 4 h sem alimentação', '≥ 4 h sem ingestão significativa de líquidos', 'Sem exercício vigoroso nas últimas 12 h', 'Sem álcool nas últimas 24 h', 'Bexiga esvaziada', 'Roupa leve e bolsos vazios', 'Descalço e sem meias', 'Objetos metálicos removidos', 'Cerca de 3 min em ortostatismo'] },
        { id: 'bioimpedance_protocol_complete', label: 'Protocolo cumprido integralmente?', type: 'radio', options: ['Sim', 'Não'] },
        { id: 'bioimpedance_protocol_deviation', label: 'Se não, desvio', type: 'textarea', conditional: { depends_on: 'bioimpedance_protocol_complete', value: 'Não' } },
        { id: 'bioimpedance_time', label: 'Horário da bioimpedância', type: 'text', placeholder: 'HH:MM' },
      ],
    },
    {
      id: 'body_composition', title: '11. Bioimpedância — composição corporal', questions: [
        { id: 'bioimpedance_configuration', label: 'Configuração utilizada', type: 'radio', options: ['Masculina', 'Feminina'] },
        ...[
          ['bio_weight', 'Peso (kg)'], ['bio_bmi', 'IMC (kg/m²)'], ['total_body_water_l', 'Água corporal total (L)'], ['total_body_water_percent', 'Água corporal total (%)'], ['protein_mass', 'Massa proteica (kg)'], ['mineral_mass', 'Massa mineral (kg)'], ['muscle_mass', 'Massa muscular (kg)'], ['skeletal_muscle_mass', 'Massa muscular esquelética (kg)'], ['fat_free_mass', 'Massa livre de gordura (kg)'], ['body_fat_mass', 'Massa gorda corporal (kg)'], ['body_fat_percent', 'Percentual de gordura corporal (%)'], ['extracellular_water_ratio', 'Relação de água extracelular'], ['visceral_fat_level', 'Nível de gordura visceral'], ['abdominal_fat_index', 'Índice de gordura abdominal'], ['obesity_degree', 'Grau de obesidade (%)'], ['basal_metabolic_rate', 'Taxa metabólica basal (kcal)'], ['total_energy_expenditure', 'Gasto energético total (kcal)'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const, min: 0 })),
      ],
    },
    {
      id: 'segmental_analysis', title: '12. Análise segmentar', questions: [
        ...['Braço esquerdo', 'Braço direito', 'Tronco', 'Perna esquerda', 'Perna direita'].flatMap((label, index) => {
          const id = ['left_arm', 'right_arm', 'trunk', 'left_leg', 'right_leg'][index];
          return [
            { id: `${id}_muscle_mass`, label: `${label} — massa muscular (kg)`, type: 'number' as const, min: 0 },
            { id: `${id}_fat_mass`, label: `${label} — massa gorda (kg)`, type: 'number' as const, min: 0 },
          ];
        }),
        { id: 'upper_balance', label: 'Equilíbrio superior', type: 'text' },
        { id: 'lower_balance', label: 'Equilíbrio inferior', type: 'text' },
        { id: 'body_balance_classification', label: 'Classificação/equilíbrio corporal do aparelho', type: 'text' },
      ],
    },
    {
      id: 'segmental_impedance', title: '13. Impedância segmentar', questions: [
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
      id: 'mediana_additional', title: '14. Dados adicionais fornecidos pelo Mediana', questions: [
        ...[
          ['ideal_weight', 'Peso ideal/desejável (kg)'], ['ideal_muscle_mass', 'Massa muscular ideal (kg)'], ['ideal_fat_mass', 'Massa gorda ideal (kg)'], ['weight_control', 'Controle de peso (kg)'], ['fat_control', 'Controle de gordura (kg)'], ['muscle_control', 'Controle de músculo (kg)'], ['mediana_score', 'Score Mediana'],
        ].map(([id, label]) => ({ id, label, type: 'number' as const })),
      ],
    },
    {
      id: 'trans_bioimpedance', title: '15. Bioimpedância nos homens trans', questions: [
        { id: 'male_configuration_time', label: 'Avaliação A — configuração masculina (horário)', type: 'text', placeholder: 'HH:MM', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'male_configuration_complete', label: 'Avaliação A — relatório completo', type: 'boolean', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'female_configuration_time', label: 'Avaliação B — configuração feminina (horário)', type: 'text', placeholder: 'HH:MM', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'female_configuration_complete', label: 'Avaliação B — relatório completo', type: 'boolean', conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'between_measurements_incident', label: 'Houve intercorrência entre as medidas?', type: 'radio', options: ['Não', 'Sim'], conditional: { depends_on: 'participant_group', value: 'Homem trans' } },
        { id: 'between_measurements_incident_description', label: 'Se sim, descreva', type: 'textarea', conditional: { depends_on: 'between_measurements_incident', value: 'Sim' } },
      ],
    },
    {
      id: 'dynamometry', title: '16. Dinamometria manual', questions: [
        { id: 'dynamometer_equipment', label: 'Equipamento', type: 'text' },
        { id: 'dynamometer_model', label: 'Modelo', type: 'text', placeholder: 'NIX80' },
        { id: 'dynamometer_serial', label: 'Número de série', type: 'text' },
        { id: 'dynamometer_calibration', label: 'Situação da calibração', type: 'text' },
        { id: 'dominant_hand', label: 'Mão dominante', type: 'radio', options: ['Direita', 'Esquerda', 'Ambidestra'] },
        ...['Dominante', 'Não dominante'].flatMap((label, index) => {
          const id = index === 0 ? 'dominant' : 'non_dominant';
          return [1, 2, 3].map((attempt) => ({ id: `${id}_hand_attempt_${attempt}`, label: `${label} — ${attempt}ª tentativa (kg)`, type: 'number' as const, min: 0 }))
            .concat([{ id: `${id}_hand_max`, label: `${label} — maior valor (kg)`, type: 'number' as const, min: 0 }]);
        }),
      ],
    },
    {
      id: 'final_review', title: '17. Conferência final', questions: [
        { id: 'all_steps_completed', label: 'Todas as etapas previstas foram realizadas?', type: 'radio', options: ['Sim', 'Não'] },
        { id: 'missing_data', label: 'Há dados ausentes?', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'missing_variables', label: 'Variáveis ausentes', type: 'textarea', conditional: { depends_on: 'missing_data', value: 'Sim' } },
        { id: 'missing_data_reason', label: 'Motivo dos dados ausentes', type: 'textarea', conditional: { depends_on: 'missing_data', value: 'Sim' } },
        { id: 'collection_incident', label: 'Intercorrência durante a coleta?', type: 'radio', options: ['Não', 'Sim'] },
        { id: 'collection_incident_description', label: 'Descrição da intercorrência', type: 'textarea', conditional: { depends_on: 'collection_incident', value: 'Sim' } },
        { id: 'general_notes', label: 'Observações gerais', type: 'textarea' },
        { id: 'reviewed_by', label: 'Responsável pela conferência', type: 'text' },
        { id: 'review_date', label: 'Data da conferência', type: 'date' },
      ],
    },
  ],
};
