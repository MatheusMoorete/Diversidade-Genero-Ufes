import React from 'react';
import { Button } from '@/components/shared/Button';

interface DangerZoneProps {
    patientName: string;
    showConfirm: boolean;
    setShowConfirm: (show: boolean) => void;
    onDelete: () => void;
    isDeleting: boolean;
}

/**
 * Seção de exclusão do paciente.
 */
export const DangerZone: React.FC<DangerZoneProps> = ({
    patientName,
    showConfirm,
    setShowConfirm,
    onDelete,
    isDeleting
}) => {
    return (
        <div className="mt-16 pt-8 border-t border-gray-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Controle de Registro</h3>

            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="text-red-400 hover:text-red-600 text-sm flex items-center gap-2 transition-all group"
                >
                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Arquivar registro deste paciente
                </button>
            ) : (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 max-w-lg">
                    <h4 className="text-red-800 font-bold mb-2">Confirmar Exclusão</h4>
                    <p className="text-red-700/80 text-sm mb-4 leading-relaxed">
                        Você está prestes a arquivar o prontuário de <strong>{patientName}</strong>.
                        Os dados serão removidos da visualização principal mas permanecerão recuperáveis na lixeira do sistema.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={onDelete}
                            isLoading={isDeleting}
                        >
                            Confirmar Arquivamento
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfirm(false)}
                            disabled={isDeleting}
                        >
                            Manter Ativo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
