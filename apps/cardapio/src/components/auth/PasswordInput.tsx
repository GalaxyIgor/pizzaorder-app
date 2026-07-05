// src/components/auth/PasswordInput.tsx
'use client';

import { useState } from 'react';

interface PasswordInputProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  placeholder?: string;
  className?: string;
  helperText?: string;
}

export function PasswordInput({
  id,
  name,
  label,
  required = false,
  autoComplete = 'current-password',
  minLength,
  placeholder,
  className = 'w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40',
  helperText,
}: PasswordInputProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-carbono mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visivel ? 'text' : 'password'}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          placeholder={placeholder}
          className={className}
        />
        <button
          type="button"
          onClick={() => setVisivel(!visivel)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-creme-muted hover:text-carbono transition-colors"
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visivel ? '🙈' : '👁️'}
        </button>
      </div>
      {helperText && <p className="text-xs text-creme-muted mt-1">{helperText}</p>}
    </div>
  );
}
