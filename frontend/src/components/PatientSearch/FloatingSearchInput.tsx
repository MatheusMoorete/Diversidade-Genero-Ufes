/**
 * Componente de busca com floating label e dropdown.
 * Design moderno estilo Google Forms.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { patientService } from '@/services/api';
import type { Patient } from '@/types';

interface FloatingSearchInputProps {
  onSelectPatient: (patient: Patient) => void;
  placeholder?: string;
  className?: string;
  navigateOnClick?: boolean; // Se true, navega para /patient/:id ao invés de chamar onSelectPatient
}

export const FloatingSearchInput: React.FC<FloatingSearchInputProps> = ({
  onSelectPatient,
  placeholder = 'Digite o nome do paciente...',
  className = '',
  navigateOnClick = false,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = searchTerm.length > 0;
  const isLabelFloating = isFocused || hasValue;

  // Busca pacientes quando o termo de busca muda
  useEffect(() => {
    const searchPatients = async () => {
      if (debouncedSearchTerm.trim().length < 2) {
        setPatients([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await patientService.searchPatients(debouncedSearchTerm, 0, 10);
        setPatients(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
        setPatients([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    searchPatients();
  }, [debouncedSearchTerm]);

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
    setPatients([]);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || patients.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < patients.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < patients.length) {
          handleSelect(patients[selectedIndex]);
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
            setIsFocused(true);
            if (patients.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay para permitir clique no dropdown
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isLabelFloating ? placeholder : ''}
          className={`
            w-full pt-6 pb-2 px-0
            bg-transparent 
            border-0 border-b-2
            border-t-0 border-l-0 border-r-0
            focus:outline-none focus:ring-0 focus:border-none
            focus:border-b-2 focus:border-primary-500
            transition-all duration-200
            border-gray-300
            ${isLabelFloating ? 'text-base' : 'text-base'}
          `}
        />
        <label
          className={`
            absolute left-0 pointer-events-none
            transition-all duration-200 ease-in-out
            ${isLabelFloating
              ? 'top-0 text-xs text-primary-600'
              : 'top-6 text-base text-gray-500'
            }
          `}
        >
          Buscar paciente
        </label>
        {isLoading && (
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
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

      {isOpen && patients.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-auto"
        >
          {patients.map((patient, index) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              className={`
                w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                transition-colors duration-150
                ${selectedIndex === index ? 'bg-primary-50 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}
              `}
            >
              <div className="font-medium text-gray-900">{patient.full_name}</div>
            </button>
          ))}
        </div>
      )}

      {isOpen && !isLoading && patients.length === 0 && debouncedSearchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-md shadow-xl p-4 text-center text-gray-500">
          Nenhum paciente encontrado
        </div>
      )}
    </div>
  );
};

