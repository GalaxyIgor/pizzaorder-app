// src/components/PasswordInput.tsx
'use client';

// Campo de senha com alternância mostrar/ocultar (ícone de olho em SVG,
// herda a cor do texto via currentColor).

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
          className={`${className} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisivel(!visivel)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-creme-muted hover:text-carbono transition-colors"
          aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
          title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {visivel ? <IconeOlhoFechado /> : <IconeOlho />}
        </button>
      </div>
      {helperText && <p className="text-xs text-creme-muted mt-1">{helperText}</p>}
    </div>
  );
}

function IconeOlho() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeOlhoFechado() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-2.16 3.19" />
      <path d="M6.61 6.61A18.83 18.83 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 5.39-1.61" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}
