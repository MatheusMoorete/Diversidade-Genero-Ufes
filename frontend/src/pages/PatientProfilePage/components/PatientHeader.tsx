import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Patient } from '@/types';

interface PatientHeaderProps {
    patient: Patient;
    latestFormData: Record<string, unknown>;
    patientAge: number | null;
    formCount: number;
}

/**
 * Cabeçalho do perfil do paciente com nome e estatísticas rápidas.
 */
export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, latestFormData, patientAge, formCount }) => {
    const navigate = useNavigate();

    return (
        <div className="mb-8">
            <button
                onClick={() => navigate('/form')}
                className="text-gray-600 hover:text-gray-900 flex items-center space-x-2 transition-colors mb-4"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Voltar</span>
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{patient.full_name}</h1>
                        {!!latestFormData.social_name && (
                            <p className="text-gray-500 text-sm mt-1">
                                Nome social: <span className="font-medium text-gray-700">{String(latestFormData.social_name)}</span>
                            </p>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-wrap gap-3">
                        {patientAge !== null && (
                            <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                {patientAge} anos
                            </div>
                        )}
                        {!!latestFormData.blood_pressure && (
                            <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1">
                                <span>❤️</span> PA: {String(latestFormData.blood_pressure)}
                            </div>
                        )}
                        {latestFormData.using_hormone_therapy === 'Sim' && (
                            <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                💊 Em hormonização
                            </div>
                        )}
                        <button
                            onClick={() => navigate(`/form?patientId=${patient.id}`)}
                            className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#4A6FA5] text-white hover:bg-[#3b5984] transition-colors"
                        >
                            Novo retorno
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                    <p>
                        📅 Cadastrado em:{' '}
                        <span className="text-gray-700">{format(new Date(patient.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    </p>
                    <p>
                        📋 {formCount} atendimento{formCount !== 1 ? 's' : ''} registrado{formCount !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
};
