import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** 0 keeps it until dismissed; saves and failures want different defaults. */
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'tone' | 'durationMs'>> {
  id: number;
  message?: string;
  action?: ToastOptions['action'];
}

export const Toast: React.FC<ToastOptions & { onDismiss?: () => void }> = ({
  title,
  message,
  tone = 'info',
  action,
  onDismiss
}) => {
  const style = {
    success: { icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600' },
    info: { icon: <Info className="h-5 w-5" />, color: 'text-indigo-600' },
    error: { icon: <XCircle className="h-5 w-5" />, color: 'text-rose-600' }
  }[tone];

  return (
    <aside
      role={tone === 'error' ? 'alert' : 'status'}
      className="flex w-full max-w-sm items-start gap-3 rounded-panel border border-slate-200 bg-white p-4 text-start shadow-raised"
    >
      <span className={`mt-0.5 shrink-0 ${style.color}`}>{style.icon}</span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-ink">{title}</strong>
        {message && <span className="mt-1 block text-xs leading-relaxed text-slate-600">{message}</span>}
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss?.();
            }}
            className="mt-2 min-h-9 rounded-pill px-2 text-xs font-extrabold text-indigo-700 underline-offset-2 hover:underline"
          >
            {action.label}
          </button>
        )}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-slate-500 hover:bg-slate-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </aside>
  );
};

const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null);

const MAX_VISIBLE = 3;

/** One toast surface for the whole app: queue, auto-dismiss, live region, no per-screen state. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);

  const push = useCallback((toast: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item: ToastItem = {
      id,
      title: toast.title,
      message: toast.message,
      tone: toast.tone ?? 'info',
      durationMs: toast.durationMs ?? (toast.tone === 'error' ? 8000 : 3500),
      action: toast.action
    };
    setItems((current) => [...current.slice(-(MAX_VISIBLE - 1)), item]);
    if (item.durationMs > 0) window.setTimeout(() => dismiss(id), item.durationMs);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-5 start-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2 sm:start-auto sm:end-5 sm:translate-x-0 sm:items-end"
      >
        {items.map((item) => (
          <span key={item.id} className="pointer-events-auto block w-full max-w-sm">
            <Toast
              title={item.title}
              message={item.message}
              tone={item.tone}
              action={item.action}
              onDismiss={() => dismiss(item.id)}
            />
          </span>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ((toast: ToastOptions) => void) => {
  const push = useContext(ToastContext);
  if (!push) throw new Error('useToast must be used inside <ToastProvider>.');
  return push;
};
