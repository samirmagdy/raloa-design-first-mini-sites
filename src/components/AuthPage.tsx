import React, { useState } from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import type { Locale } from '../types';
import { navigate } from '../app/router';
import { useRepository, useSession } from '../services/RepositoryContext';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { ui, text, tx } from '../i18n/ui';

interface AuthPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ locale, onReturnHome }) => {
  const repository = useRepository();
  const { signIn, status } = useSession();
  const isRtl = locale === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error.fields?.length
          ? text(result.error.fields[0].message, locale)
          : text(result.error.message, locale)
      );
      return;
    }
    navigate('/studio/overview');
  };

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="flex min-h-screen items-center justify-center bg-surface-alt px-4 py-12">
      <div className="w-full max-w-md">
        <button type="button" onClick={onReturnHome} className="mx-auto flex min-h-11 items-center gap-2 text-sm font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink">
            <RaloaMark size={25} theme="on-dark" />
          </span>
          RALOA
        </button>

        <Surface className="mt-6 p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-control bg-indigo-50 text-indigo-600">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {status === 'signed-in' ? tx(ui.auth.welcomeBack, locale) : tx(ui.auth.signIn, locale)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{tx(ui.auth.demoNotice, locale)}</p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Input
              label={tx(ui.auth.email, locale)}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              error={error && error.includes('@') ? error : undefined}
            />
            <Input
              label={tx(ui.auth.password, locale)}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={isRtl ? '٨ أحرف على الأقل' : 'At least 8 characters'}
            />
            {error && !error.includes('@') && (
              <p role="alert" className="rounded-control bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={busy} disabled={!email.trim() || !password}>
              {tx(ui.auth.signIn, locale)}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </form>

          <p className="mt-5 text-center text-2xs text-slate-500">{tx(ui.common.demoNote, locale)}</p>
        </Surface>
      </div>
    </main>
  );
};
