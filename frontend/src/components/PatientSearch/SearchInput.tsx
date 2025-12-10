/**
 * Componente de busca de pacientes com dropdown.
 * Mostra lista completa de pacientes ao abrir e permite filtrar por nome.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/api';
import { queryKeys } from '@/config/queryKeys';
import type { Patient } from '@/types';

interface SearchInputProps {
    onSelectPatient: (patient: Patient) => void;
    placeholder?: string;
    className?: string;
    navigateOnClick?: boolean; // Se true, navega para /patient/:id ao invés de chamar onSelectPatient
}

export const SearchInput: React.FC<SearchInputProps> = ({
    onSelectPatient,
    placeholder = 'Buscar paciente',
    className = '',
    navigateOnClick = false,
}) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Busca todos os pacientes usando React Query (com cache)
    const { data: allPatients = [], isLoading } = useQuery<Patient[]>({
        queryKey: queryKeys.patients.list({}),
        queryFn: () => patientService.searchPatients('', 0, 1000),
        enabled: isOpen, // Só busca quando dropdown está aberto
        staleTime: 1000 * 60 * 2, // 2 minutos
        gcTime: 1000 * 60 * 5, // 5 minutos em cache
    });

    // Filtra pacientes baseado no termo de busca
    const filteredPatients = React.useMemo(() => {
        if (!searchTerm.trim()) {
            return allPatients;
        }
        return allPatients.filter((patient) =>
            patient.full_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, allPatients]);

    // Reseta índice selecionado quando pacientes mudam
    useEffect(() => {
        setSelectedIndex(-1);
    }, [filteredPatients]);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (patient: Patient) => {
        if (navigateOnClick) {
            // Navega para a página do paciente
            navigate(`/patient/${patient.id}`);
        } else {
            // Chama o callback padrão
            onSelectPatient(patient);
        }
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleToggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || filteredPatients.length === 0) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev < filteredPatients.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredPatients.length) {
                    handleSelect(filteredPatients[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    return (
        <div className={`relative w-full ${className}`}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => {
                        setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="
            w-full px-4 py-3 pr-10
            bg-white 
            border border-gray-300 
            rounded-lg
            text-base
            text-gray-900
            placeholder:text-gray-400
            focus:outline-none
            focus:border-gray-400
            focus:ring-2 focus:ring-gray-900/20
            transition-all duration-200
            shadow-sm
          "
                />
                <button
                    type="button"
                    onClick={handleToggleDropdown}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg
                        className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isLoading && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                        <svg
                            className="animate-spin h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>
                )}
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto"
                >
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                            Carregando pacientes...
                        </div>
                    ) : filteredPatients.length > 0 ? (
                        filteredPatients.map((patient, index) => (
                            <button
                                key={patient.id}
                                type="button"
                                onClick={() => handleSelect(patient)}
                                className={`
                  w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                  transition-colors duration-150
                  ${selectedIndex === index ? 'bg-gray-100 border-l-4 border-gray-900' : 'border-l-4 border-transparent'}
                `}
                            >
                                <div className="font-medium text-gray-900">{patient.full_name}</div>
                            </button>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            Nenhum paciente encontrado
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

