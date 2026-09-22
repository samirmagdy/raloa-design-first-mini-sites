import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', ...props },
  ref
) {
  const inputId = id ?? `input-${props.name ?? 'field'}`;
  return (
    <label className="block text-start">
      {label && <span className="mb-2 block text-sm font-bold text-slate-800">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 placeholder:text-slate-400 ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''} ${className}`}
        {...props}
      />
      {error && <span id={`${inputId}-error`} className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span>}
    </label>
  );
});

