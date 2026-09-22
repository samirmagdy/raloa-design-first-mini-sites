import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Palette, Sparkles, UserPlus } from 'lucide-react';
import type { Locale } from '../types';
import { navigate } from '../app/router';
import { useRepository } from '../services/RepositoryContext';
import { useAsyncResource } from '../services/useAsyncResource';
import type { RepositoryError, Template, ThemeConfig } from '../services';
import { themePresets } from '../theme/themeRegistry';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Surface } from './ui/Surface';
import { LoadingState, ErrorState } from './ui/States';
import { useToast } from './ui/Toast';
import { ui, text, tx, fill } from '../i18n/ui';

interface OnboardingPageProps {
  locale: Locale;
  onReturnHome: () => void;
}

const RESUME_KEY = 'raloa.onboarding.v1';
const STEPS = ['template', 'identity', 'theme', 'publish'] as const;
type Step = (typeof STEPS)[number];

interface Progress {
  step: Step;
  templateId: string;
  username: string;
  displayName: string;
  themeId: string;
  profileId?: string;
}

const readProgress = (): Progress | null => {
  try {
    const stored = window.localStorage.getItem(RESUME_KEY);
    return stored ? (JSON.parse(stored) as Progress) : null;
  } catch {
    return null;
  }
};

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ locale, onReturnHome }) => {
  const repository = useRepository();
  const toast = useToast();
  const isRtl = locale === 'ar';
  const stored = useMemo(readProgress, []);

  const [step, setStep] = useState<Step>(stored?.step ?? 'template');
  const [templateId, setTemplateId] = useState(stored?.templateId ?? '');
  const [username, setUsername] = useState(stored?.username ?? '');
  const [displayName, setDisplayName] = useState(stored?.displayName ?? '');
  const [themeId, setThemeId] = useState(stored?.themeId ?? 'raloa-light');
  const [profileId, setProfileId] = useState<string | null>(stored?.profileId ?? null);
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [themeChosen, setThemeChosen] = useState(!!stored?.themeId);
  const [error, setError] = useState<RepositoryError | null>(null);

  const templates = useAsyncResource(() => repository.templates.list(), []);
  const profile = useAsyncResource(
    () => repository.profiles.get(profileId as string),
    [profileId],
    { enabled: !!profileId }
  );
  const template = useMemo<Template | null>(
    () => (templates.data ?? []).find((item) => item.id === templateId) ?? templates.data?.[0] ?? null,
    [templates.data, templateId]
  );

  useEffect(() => {
    if (!template && templates.data?.length) setTemplateId(templates.data[0].id);
  }, [template, templates.data]);

  useEffect(() => {
    const next = themePresets.find((preset) => preset.id === themeId) ?? themePresets[0];
    setTheme(next);
  }, [themeId]);

  useEffect(() => {
    const progress: Progress = { step, templateId: templateId || template?.id || '', username, displayName, themeId, profileId: profileId ?? undefined };
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(progress));
  }, [step, templateId, template?.id, username, displayName, themeId, profileId]);

  const goNext = async () => {
    setError(null);
    if (step === 'identity') {
      const id = await ensureProfile();
      if (!id || !template) return;
      setBusy(true);
      const applied = await repository.templates.apply(id, template.id);
      setBusy(false);
      if (!applied.ok) return setError(applied.error);
      if (!themeChosen) setThemeId(template.theme.id);
      profile.reload();
      setStep('theme');
      return;
    }
    if (step === 'template') {
      setStep('identity');
      return;
    }
    if (step === 'theme' && profileId && theme && profile.data) {
      setBusy(true);
      const saved = await repository.themes.save(profileId, theme, profile.data.version);
      setBusy(false);
      if (!saved.ok) return setError(saved.error);
      profile.reload();
      setStep('publish');
    }
  };

  const ensureProfile = async (): Promise<string | null> => {
    if (profileId) return profileId;
    setBusy(true);
    const result = await repository.profiles.create({ username, displayName });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    setProfileId(result.data.id);
    return result.data.id;
  };

  const publish = async () => {
    if (!profileId) return;
    setBusy(true);
    const pages = await repository.pages.list(profileId);
    if (pages.ok) {
      for (const page of pages.data) await repository.pages.setPublished(page.id, true);
    }
    const result = await repository.profiles.setPublished(profileId, true);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setPublished(true);
    window.localStorage.removeItem(RESUME_KEY);
    toast({ title: tx(ui.onboarding.published, locale), message: tx(ui.onboarding.publishedBody, locale), tone: 'success' });
    navigate(`/p/${username}`);
  };

  if (templates.isLoading) return <LoadingState label={tx(ui.common.loading, locale)} variant="card" />;
  if (templates.error) {
    return (
      <main className="min-h-screen bg-surface-alt p-6">
        <ErrorState title={tx(ui.onboarding.heading, locale)} body={text(templates.error.message, locale)} onRetry={templates.retry} retryLabel={tx(ui.common.retry, locale)} />
      </main>
    );
  }

  const stepIndex = STEPS.indexOf(step);
  const checklist: Array<{ id: Step; label: string; done: boolean }> = [
    { id: 'template', label: tx(ui.onboarding.stepTemplate, locale), done: stepIndex > 0 },
    { id: 'identity', label: tx(ui.onboarding.stepIdentity, locale), done: stepIndex > 1 },
    { id: 'theme', label: tx(ui.onboarding.stepTheme, locale), done: stepIndex > 2 || step === 'publish' },
    { id: 'publish', label: tx(ui.onboarding.stepPublish, locale), done: published }
  ];

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-surface-alt px-4 py-8 text-ink sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <button type="button" onClick={onReturnHome} className="flex min-h-11 items-center gap-2 text-sm font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink text-white">R</span>
            RALOA
          </button>
          <span className="text-xs font-bold text-slate-500">{fill(tx(ui.onboarding.progress, locale), { current: stepIndex + 1, total: STEPS.length })}</span>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{tx(ui.onboarding.checklist, locale)}</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{tx(ui.onboarding.heading, locale)}</h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">{tx(ui.onboarding.help, locale)}</p>
            </div>
            <ol className="space-y-2">
              {checklist.map((item, index) => (
                <li key={item.id} className={`flex min-h-11 items-center gap-3 rounded-control border px-3 text-sm font-bold ${item.id === step ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-600'}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-2xs font-extrabold ${item.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {item.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  {item.label}
                </li>
              ))}
            </ol>
            {stored && stored.step !== step && (
              <button
                type="button"
                onClick={() => {
                  setStep(stored.step);
                  setUsername(stored.username);
                  setDisplayName(stored.displayName);
                  setThemeId(stored.themeId);
                  setProfileId(stored.profileId ?? null);
                }}
                className="flex min-h-11 items-center gap-2 text-xs font-extrabold text-indigo-700 underline underline-offset-2"
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                {tx(ui.onboarding.resume, locale)}
              </button>
            )}
          </div>

          <Surface className="p-5 sm:p-7">
            {step === 'template' && (
              <>
                <StepHeading icon={Sparkles} title={tx(ui.onboarding.stepTemplate, locale)} locale={locale} />
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(templates.data ?? []).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTemplateId(item.id)}
                      aria-pressed={item.id === template?.id}
                      className={`min-h-28 rounded-panel border p-4 text-start transition ${
                        item.id === template?.id ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block truncate text-sm font-extrabold">{text(item.name, locale)}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{text(item.tagline, locale)}</span>
                      <span className="mt-3 flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-pill bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'identity' && (
              <>
                <StepHeading icon={UserPlus} title={tx(ui.onboarding.stepIdentity, locale)} locale={locale} />
                <div className="mt-5 space-y-4">
                  <Input
                    label={tx(ui.settings.username, locale)}
                    value={username}
                    onChange={(event) => setUsername(event.target.value.trim().toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="your-name"
                    hint={`${tx(ui.settings.usernameHelp, locale)} · raloa.app/@${username || '…'}`}
                  />
                  <Input label={tx(ui.settings.displayName, locale)} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={template ? text(template.name, locale) : ''} />
                </div>
              </>
            )}

            {step === 'theme' && theme && (
              <>
                <StepHeading icon={Palette} title={tx(ui.onboarding.stepTheme, locale)} locale={locale} />
                <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {themePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => { setThemeId(preset.id); setThemeChosen(true); }}
                      aria-pressed={preset.id === themeId}
                      className={`min-h-16 rounded-control border-2 p-2 ${preset.id === themeId ? 'border-indigo-500' : 'border-transparent'}`}
                      style={{ backgroundColor: preset.background }}
                      aria-label={preset.id}
                    >
                      <span className="block h-2 w-full rounded-pill" style={{ backgroundColor: preset.accent }} />
                      <span className="mt-2 block h-2 w-2/3 rounded-pill" style={{ backgroundColor: preset.mutedText, opacity: 0.5 }} />
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'publish' && (
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-panel bg-emerald-50 text-emerald-600">
                  <Check className="h-7 w-7" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold">{tx(published ? ui.onboarding.published : ui.onboarding.publishReady, locale)}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{tx(published ? ui.onboarding.publishedBody : ui.onboarding.publishReadyBody, locale)}</p>
                <p className="mt-3 inline-flex rounded-pill bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600" dir="ltr">
                  raloa.app/@{username}
                </p>
              </div>
            )}

            {error && <p role="alert" className="mt-5 rounded-control bg-rose-50 p-3 text-sm font-semibold text-rose-700">{text(error.message, locale)}</p>}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-2xs text-slate-500">{tx(ui.common.demoNote, locale)}</p>
              <div className="flex gap-2">
                {step !== 'template' && step !== 'publish' && (
                  <Button variant="secondary" onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}>
                    {tx(ui.common.back, locale)}
                  </Button>
                )}
                {step === 'publish' ? (
                  <>
                    <Button variant="secondary" onClick={() => navigate('/studio/editor')}>
                      {tx(ui.onboarding.goToStudio, locale)}
                    </Button>
                    <Button onClick={() => void publish()} loading={busy}>
                      {tx(ui.onboarding.stepPublish, locale)}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => void goNext()} loading={busy} disabled={(step === 'identity' && !username.trim()) || (step === 'theme' && !profile.data) || !template}>
                    {step === 'theme' ? tx(ui.onboarding.stepPublish, locale) : tx(ui.common.next, locale)}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </main>
  );
};

const StepHeading: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; locale: Locale }> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3">
    <span className="flex h-10 w-10 items-center justify-center rounded-control bg-indigo-50 text-indigo-600">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <h2 className="text-lg font-extrabold">{title}</h2>
  </div>
);
