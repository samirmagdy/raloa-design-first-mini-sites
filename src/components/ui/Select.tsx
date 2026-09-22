import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, hint, id, className = '', value, ...props },
  ref
) {
  const selectId = id ?? `select-${props.name ?? 'field'}`;
  return (
    <span className="block text-start">
      {label && (
        <label htmlFor={selectId} className="mb-2 block text-sm font-bold text-slate-800">
          {label}
        </label>
      )}
      <span className="relative block">
        <select
          ref={ref}
          id={selectId}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={`min-h-11 w-full appearance-none rounded-control border border-slate-300 bg-white px-3 pe-9 text-sm font-bold text-ink outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 rtl:pe-3 rtl:ps-9 ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 rtl:start-3 rtl:end-auto"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {hint && !error && (
        <span id={`${selectId}-hint`} className="mt-1.5 block text-xs text-slate-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${selectId}-error`} className="mt-1.5 block text-xs font-semibold text-rose-600">
          {error}
        </span>
      )}
    </span>
  );
});
