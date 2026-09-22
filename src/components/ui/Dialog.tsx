import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl'
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: DialogSize;
  /** Center for confirmations, end for mobile sheets. */
  placement?: 'center' | 'bottom' | 'end';
  footer?: React.ReactNode;
  children: React.ReactNode;
  closeLabel?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  placement = 'center',
  footer,
  children,
  closeLabel = 'Close dialog'
}) => {
  const dialogRef = useModalAccessibility<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const alignment =
    placement === 'bottom' ? 'items-end sm:items-center' : placement === 'end' ? 'items-stretch sm:items-center justify-end' : 'items-center';

  return createPortal(
    <div className={`fixed inset-0 z-50 flex bg-slate-950/50 p-4 backdrop-blur-[2px] ${alignment}`} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`flex max-h-[90vh] w-full ${placement === 'end' ? 'sm:max-w-md' : sizes[size]} flex-col overflow-hidden rounded-panel border border-slate-200 bg-white text-ink shadow-raised`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={`dialog-${title.replace(/\s+/g, '-').toLowerCase()}`} className="truncate text-base font-extrabold">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-100 bg-surface-alt px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
};
