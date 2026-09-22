import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders the "n / max" counter the SEO and bio editors need. */
  counter?: { value: number; max: number };
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = '', counter, ...props },
  ref
) {
  const fieldId = id ?? `textarea-${props.name ?? 'field'}`;
  const over = counter ? counter.value > counter.max : false;
  return (
    <label className="block text-start" htmlFor={fieldId}>
      {label && (
        <span className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-slate-800">{label}</span>
          {counter && (
            <span className={`text-2xs font-bold tabular-nums ${over ? 'text-rose-600' : 'text-slate-400'}`}>
              {counter.value}/{counter.max}
            </span>
          )}
        </span>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error) || over || undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={`w-full resize-y rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 placeholder:text-slate-400 ${
          error || over ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <span id={`${fieldId}-hint`} className="mt-1.5 block text-xs text-slate-500">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${fieldId}-error`} className="mt-1.5 block text-xs font-semibold text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
});
