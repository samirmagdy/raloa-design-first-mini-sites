import React from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Surface } from './Surface';

export const Skeleton: React.FC<{ className?: string; circle?: boolean }> = ({ className = '', circle = false }) => (
  <span className={`block animate-pulse bg-slate-200 ${circle ? 'rounded-full' : 'rounded-control'} ${className}`} aria-hidden="true" />
);

interface LoadingStateProps {
  label: string;
  /** Structural placeholder that matches the panel it replaces. */
  variant?: 'card' | 'list' | 'table' | 'profile' | 'chart';
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label, variant = 'card' }) => (
  <section aria-busy="true" aria-label={label} className="space-y-4">
    {variant === 'profile' && (
      <Surface className="p-6">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
          <Skeleton circle className="h-24 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-4 w-full space-y-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </Surface>
    )}
    {variant === 'list' && (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-14 w-full" />
        ))}
      </div>
    )}
    {variant === 'table' && (
      <Surface className="overflow-hidden p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-11 w-full" />
          ))}
        </div>
      </Surface>
    )}
    {variant === 'chart' && (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-32 w-full" />
        ))}
        <Skeleton className="h-64 w-full md:col-span-3" />
      </div>
    )}
    {variant === 'card' && (
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )}
  </section>
);

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Labels a state that is only populated by demo data. */
  note?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, icon: Icon = Inbox, action, secondaryAction, note }) => (
  <Surface className="px-6 py-12 text-center">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-indigo-50 text-indigo-600">
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-lg font-extrabold text-ink">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{body}</p>
    {(action || secondaryAction) && (
      <span className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </span>
    )}
    {note && <p className="mt-4 text-xs text-slate-500">{note}</p>}
  </Surface>
);

interface ErrorStateProps {
  title: string;
  body: string;
  onRetry?: () => void;
  retryLabel: string;
  /** Second escape hatch, e.g. "Back to website". */
  action?: { label: string; onClick: () => void };
  detail?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, body, onRetry, retryLabel, action, detail }) => (
  <Surface className="px-6 py-10 text-center">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-rose-50 text-rose-600">
      <AlertTriangle className="h-6 w-6" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-lg font-extrabold text-ink">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">{body}</p>
    {detail && <p className="mx-auto mt-2 max-w-sm text-xs text-slate-400">{detail}</p>}
    <span className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </span>
  </Surface>
);

/** Full-page variant used by route boundaries. */
export const PageState: React.FC<{ title: string; body: string; action?: { label: string; onClick: () => void } }> = ({
  title,
  body,
  action
}) => (
  <main className="flex min-h-screen items-center justify-center bg-surface-alt p-6 text-center">
    <div className="w-full max-w-md">
      <EmptyState title={title} body={body} action={action} />
    </div>
  </main>
);
