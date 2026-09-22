import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  /** 'pill' reads as a status row (publish, visibility); 'inline' sits next to a title. */
  variant?: 'row' | 'inline';
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description, disabled, id, variant = 'row' }) => {
  const switchId = id ?? `switch-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const control = (
    <span
      className={`flex h-6 w-11 shrink-0 items-center rounded-pill p-0.5 transition ${
        checked ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-300'
      }`}
      aria-hidden="true"
    >
      <span className="h-[1.125rem] w-[1.125rem] rounded-pill bg-white shadow-sm" />
    </span>
  );

  if (variant === 'inline') {
    return (
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex min-h-11 items-center gap-3 rounded-pill px-1 text-sm font-bold text-slate-700 disabled:opacity-50"
      >
        {control}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      id={switchId}
      role="switch"
      aria-checked={checked}
      aria-describedby={description ? `${switchId}-description` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 w-full items-center justify-between gap-4 rounded-control border px-4 text-start text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-surface-alt text-slate-600'
      }`}
    >
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description && (
          <span id={`${switchId}-description`} className="mt-0.5 block text-xs font-medium text-slate-500">
            {description}
          </span>
        )}
      </span>
      {control}
    </button>
  );
};
