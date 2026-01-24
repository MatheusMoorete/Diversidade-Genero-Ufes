// Categorias para agrupar campos do formulário (Visão de Resumo)
export const FIELD_CATEGORIES: Record<string, { title: string; icon: string; fields: string[] }> = {
    profile: {
        title: 'Perfil',
        icon: '👤',
        fields: ['social_name', 'race', 'birth_date', 'education_level', 'marital_status', 'occupation', 'family_income', 'household_size', 'phone', 'medical_record', 'tcle_signed']
    },
    hormone: {
        title: 'Terapia Hormonal',
        icon: '💊',
        fields: ['using_hormone_therapy', 'hormone_therapy_over_one_year', 'hormone_type_men', 'hormone_type_women', 'suspension_reason', 'hormone_objectives_men', 'hormone_objectives_women']
    },
    lifestyle: {
        title: 'Hábitos de Vida',
        icon: '🏃',
        fields: ['physical_activity', 'physical_activity_location', 'physical_activity_frequency', 'physical_activity_duration', 'physical_activity_type', 'alcohol_consumption', 'alcohol_frequency', 'alcohol_type', 'smoking', 'cigarette_type', 'cigarettes_per_day', 'illicit_drugs', 'illicit_drugs_type', 'illicit_drugs_frequency']
    },
    health: {
        title: 'Saúde Física',
        icon: '❤️',
        fields: ['blood_pressure', 'height', 'weight', 'bmi', 'previous_diseases', 'family_history', 'current_medications']
    },
    mental: {
        title: 'Saúde Mental',
        icon: '🧠',
        fields: ['mental_health_follow_up', 'mental_health_follow_up_duration', 'mental_health_diagnosis', 'hormone_mental_health_correlation']
    },
    effects: {
        title: 'Efeitos da Hormonização',
        icon: '📊',
        fields: ['allergic_reaction', 'acne_occurrence', 'acne_location', 'acanthosis_nigricans', 'breast_nodules', 'irritability_aggressiveness', 'stress_increase', 'mood_changes', 'self_esteem', 'satisfaction_results', 'other_health_conditions']
    },
    lab: {
        title: 'Dados Laboratoriais',
        icon: '🔬',
        fields: ['bioimpedance_weight', 'bioimpedance_muscle', 'bioimpedance_fat', 'glucose', 'tgo', 'tgp', 'triglycerides', 'total_cholesterol', 'hdl', 'ldl', 'testosterone', 'hemoglobin', 'hematocrit', 'leukocytes', 'platelets', 'other_exams']
    }
};
