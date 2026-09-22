import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: 'end' | 'start';
  width?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' } as const;

/** Off-canvas panel: submission details, block inspector on narrow screens. */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  side = 'end',
  width = 'md',
  footer,
  children
}) => {
  const panelRef = useModalAccessibility<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex" onMouseDown={onClose}>
      <div className={`flex-1 bg-slate-950/40 ${side === 'end' ? 'order-2' : 'order-1'}`} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`order-1 flex h-full w-full ${widths[width]} flex-col border-slate-200 bg-white text-ink shadow-raised ${
          side === 'end' ? 'border-s' : 'border-e'
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold">{title}</h2>
            {description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="border-t border-slate-100 bg-surface-alt px-5 py-4">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
};
