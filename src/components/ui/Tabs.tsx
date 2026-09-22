import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** 'segment' for tight toolbars, 'underline' for page-level sections. */
  variant?: 'segment' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, value, onChange, ariaLabel, variant = 'segment', className = '' }) => {
  const listRef = useRef<HTMLDivElement>(null);

  const move = (direction: 1 | -1) => {
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (!buttons.length) return;
    const current = buttons.findIndex((button) => button.dataset.active === 'true');
    const next = buttons[(current + direction + buttons.length) % buttons.length];
    onChange(next.dataset.tab ?? items[0].id);
    next.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={
        variant === 'segment'
          ? `flex gap-1 overflow-x-auto rounded-pill border border-slate-200 bg-surface-alt p-1 ${className}`
          : `flex gap-1 overflow-x-auto border-b border-slate-200 ${className}`
      }
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}
    >
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            data-tab={item.id}
            data-active={active}
            aria-selected={active}
            aria-controls={`panel-${item.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={
              variant === 'segment'
                ? `flex min-h-10 shrink-0 items-center gap-2 rounded-pill px-3 text-xs font-bold transition ${
                    active ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`
                : `-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition ${
                    active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`
            }
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            <span className="whitespace-nowrap">{item.label}</span>
            {item.badge !== undefined && (
              <span className="rounded-pill bg-slate-200/80 px-1.5 text-2xs font-extrabold text-slate-700 tabular-nums">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const TabPanel: React.FC<{ id: string; active: boolean; children: React.ReactNode }> = ({ id, active, children }) =>
  active ? (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  ) : null;
