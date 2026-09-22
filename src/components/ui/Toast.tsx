import React from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastProps {
  title: string;
  message?: string;
  tone?: ToastTone;
  onDismiss?: () => void;
}

const toneStyles: Record<ToastTone, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600' },
  info: { icon: <Info className="h-5 w-5" />, color: 'text-indigo-600' },
  error: { icon: <XCircle className="h-5 w-5" />, color: 'text-rose-600' }
};

export const Toast: React.FC<ToastProps> = ({ title, message, tone = 'info', onDismiss }) => {
  const style = toneStyles[tone];
  return (
    <aside role="status" aria-live="polite" className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-xl">
      <span className={`mt-0.5 shrink-0 ${style.color}`}>{style.icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-ink">{title}</strong>
        {message && <span className="mt-1 block text-xs leading-relaxed text-slate-600">{message}</span>}
      </span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="min-h-11 min-w-11 shrink-0 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Dismiss notification">
          <X className="mx-auto h-4 w-4" />
        </button>
      )}
    </aside>
  );
};

