/**
 * Componente de input com floating label (estilo moderno).
 * O label flutua para cima quando o campo tem foco ou valor.
 */

import React, { useState, useRef, useEffect } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  error,
  helperText,
  className = '',
  value,
  onFocus,
  onBlur,
  onChange,
  id,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id || `floating-input-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const inputValue = value || inputRef.current?.value || '';
    setHasValue(!!inputValue && inputValue !== '');
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value && e.target.value !== '');
    if (onChange) onChange(e);
  };

  // Para inputs de data, o label sempre deve flutuar porque o navegador mostra placeholder nativo
  const isDateInput = props.type === 'date' || props.type === 'datetime-local' || props.type === 'time';
  const isLabelFloating = isFocused || hasValue || isDateInput;

  // Ajusta o padding do input quando o label flutua
  const inputPaddingClass = isLabelFloating 
    ? 'pt-6' 
    : '';

  return (
    <div className={`input-floating w-full ${className}`}>
      <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={`
          input
          w-full
            ${inputPaddingClass}
            ${error ? 'input-error' : ''}
            ${props.readOnly ? 'input-readonly' : ''}
            ${isDateInput ? 'pt-6' : ''}
        `}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={`
          input-floating-label
          ${isLabelFloating ? 'input-floating-label-floating' : ''}
            ${error ? 'text-red-500' : ''}
            ${props.readOnly ? 'text-gray-400' : ''}
        `}
      >
        {label}
      </label>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};
