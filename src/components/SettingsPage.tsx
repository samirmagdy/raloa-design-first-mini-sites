import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, CloudUpload, ExternalLink, Globe2, ImagePlus, Search, Settings2, Trash2, X } from 'lucide-react';
import type { Locale } from '../types';
import { navigate, type Route, type SettingsSection } from '../app/router';
import { AppLink, useRoute } from '../app/navigation';
import { useRepository, useSession } from '../services/RepositoryContext';
import { useAsyncResource } from '../services/useAsyncResource';
import { useAutosave } from '../services/useAutosave';
import type { ProfileSocial, PublicProfile, RepositoryError, UsernameAvailability } from '../services';
import { RaloaMark } from './brand/RaloaLogo';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';
import { Surface } from './ui/Surface';
import { LoadingState, ErrorState } from './ui/States';
import { useToast } from './ui/Toast';
import { ui, text, tx } from '../i18n/ui';

interface SettingsPageProps {
  locale: Locale;
  section: SettingsSection;
  onReturnHome: () => void;
}

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));

const PLATFORMS = ['instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'github', 'spotify', 'email'];

export const SettingsPage: React.FC<SettingsPageProps> = ({ locale, section, onReturnHome }) => {
  const repository = useRepository();
  const toast = useToast();
  const isRtl = locale === 'ar';
  const { status } = useSession();
  const route: Route = useRoute();

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PublicProfile | null>(null);
  const [usernameState, setUsernameState] = useState<UsernameAvailability | 'checking' | 'idle'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const profiles = useAsyncResource(() => repository.profiles.list(), []);
  const usage = useAsyncResource(() => repository.profiles.usage(), []);
  const loaded = useAsyncResource(
    async () => {
      const active = await repository.profiles.activeId();
      if (!active.ok) return active;
      const wanted = activeProfileId ?? active.data ?? '';
      return repository.profiles.get(wanted);
    },
    [activeProfileId],
    { enabled: status === 'signed-in' }
  );

  useEffect(() => {
    if (!loaded.data) return;
    setDraft(clone(loaded.data));
    setUsernameState('idle');
  }, [loaded.data]);

  const saved = loaded.data;
  const autosave = useAutosave({
    draft,
    saved,
    enabled: Boolean(draft && saved),
    persist: async (next) => {
      if (!next || !saved) return { ok: true as const, data: null };
      const result = await repository.profiles.update(
        next.id,
        {
          displayName: next.displayName,
          username: next.username,
          role: next.role,
          bio: next.bio,
          avatarUrl: next.avatarUrl,
          avatarMediaId: next.avatarMediaId,
          socials: next.socials,
          seo: next.seo
        },
        saved.version
      );
      if (result.ok) loaded.setData(result.data);
      return result;
    },
    onReset: () => saved && setDraft(clone(saved))
  });

  const checkUsername = (value: string) => {
    setDraft((current) => (current ? { ...current, username: value.trim().toLowerCase() } : current));
    if (!value.trim()) {
      setUsernameState('idle');
      return;
    }
    setUsernameState('checking');
    void repository.profiles.checkUsername(value).then((result) => {
      if (result.ok) setUsernameState(result.data);
    });
  };

  const uploadAvatar = async (file?: File) => {
    if (!file || !draft) return;
    setUploadError(null);
    const uploaded = await repository.media.upload(file, draft.id);
    if (!uploaded.ok) return setUploadError(text(uploaded.error.message, locale));
    setDraft((current) =>
      current ? { ...current, avatarUrl: uploaded.data.url, avatarMediaId: uploaded.data.id } : current
    );
  };

  const updateSocial = (id: string, patch: Partial<ProfileSocial>) =>
    setDraft((current) =>
      current ? { ...current, socials: current.socials.map((social) => (social.id === id ? { ...social, ...patch } : social)) } : current
    );

  const fail = (error: RepositoryError) =>
    toast({ title: tx(ui.common.saveFailed, locale), message: text(error.message, locale), tone: 'error' });

  if (status === 'signed-out') {
    return (
      <Shell locale={locale} onReturnHome={onReturnHome} title={tx(ui.auth.signInRequired, locale)}>
        <ErrorState
          title={tx(ui.auth.signInRequired, locale)}
          body={tx(ui.auth.demoNotice, locale)}
          onRetry={() => navigate('/signin')}
          retryLabel={tx(ui.auth.signIn, locale)}
        />
      </Shell>
    );
  }

  if (loaded.isLoading || !draft) return <LoadingState label={tx(ui.common.loading, locale)} variant="card" />;
  if (loaded.error) {
    return (
      <ErrorState
        title={tx(ui.settings.heading, locale)}
        body={text(loaded.error.message, locale)}
        onRetry={loaded.retry}
        retryLabel={tx(ui.common.retry, locale)}
      />
    );
  }

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-surface-alt text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-8">
          <a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex items-center gap-2 text-sm font-extrabold">
            <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink">
              <RaloaMark size={25} theme="on-dark" />
            </span>
            RALOA
          </a>
          <div className="flex items-center gap-2">
            <SaveChip autosave={autosave} locale={locale} />
            <AppLink to="/studio/editor">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                {tx(ui.studio.editor, locale)}
              </Button>
            </AppLink>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] space-y-6 p-4 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{tx(ui.settings.heading, locale)}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {section === 'seo' ? tx(ui.studio.settings, locale) : tx(ui.settings.profileInfo, locale)}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{tx(ui.settings.profileInfoHelp, locale)}</p>
          </div>
          <div className="flex w-full items-end gap-2 sm:w-auto">
            <Select
              label={tx(ui.common.profile, locale)}
              value={draft.id}
              onChange={(event) => {
                setActiveProfileId(event.target.value);
                void repository.profiles.setActive(event.target.value);
              }}
              options={(profiles.data ?? []).map((item) => ({ value: item.id, label: `@${item.username}` }))}
              className="sm:w-56"
            />
            <nav className="flex gap-1 self-end overflow-x-auto rounded-pill border border-slate-200 bg-white p-1" aria-label={tx(ui.studio.navLabel, locale)}>
              {(['profile', 'seo'] as SettingsSection[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-current={section === item ? 'page' : undefined}
                  onClick={() => navigate(`/settings/${item}`)}
                  className={`min-h-9 rounded-pill px-3 text-xs font-bold ${section === item ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {item === 'profile' ? tx(ui.settings.profileInfo, locale) : 'SEO'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {section === 'profile' ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Surface className="p-5 sm:p-6">
              <SectionHeading icon={Settings2} title={tx(ui.settings.profileInfo, locale)} help={tx(ui.settings.profileInfoHelp, locale)} />
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-panel border border-slate-200 bg-slate-100">
                    {draft.avatarUrl ? (
                      <img src={draft.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{tx(ui.settings.avatar, locale)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{tx(ui.settings.avatarHelp, locale)}</p>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => void uploadAvatar(event.target.files?.[0])}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
                        <CloudUpload className="h-4 w-4" aria-hidden="true" />
                        {tx(ui.settings.uploadAvatar, locale)}
                      </Button>
                      {draft.avatarUrl && (
                        <Button size="sm" variant="ghost" onClick={() => setDraft((current) => (current ? { ...current, avatarUrl: '', avatarMediaId: undefined } : current))}>
                          <X className="h-4 w-4" aria-hidden="true" />
                          {tx(ui.settings.removeAvatar, locale)}
                        </Button>
                      )}
                    </div>
                    {uploadError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{uploadError}</p>}
                  </div>
                </div>

                <Input
                  label={tx(ui.settings.displayName, locale)}
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => (current ? { ...current, displayName: event.target.value } : current))}
                />
                <div>
                  <Input
                    label={tx(ui.settings.username, locale)}
                    value={draft.username}
                    onChange={(event) => checkUsername(event.target.value)}
                    hint={tx(ui.settings.usernameHelp, locale)}
                    error={usernameState === 'taken' || usernameState === 'reserved' || usernameState === 'invalid' ? usernameMessage(usernameState, locale) : undefined}
                  />
                  {(usernameState === 'available' || usernameState === 'checking') && (
                    <p className={`mt-1.5 flex items-center gap-1.5 text-xs font-bold ${usernameState === 'available' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {usernameState === 'available' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      {usernameState === 'checking' ? tx(ui.common.loading, locale) : tx(ui.settings.usernameAvailable, locale)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500" dir="ltr">raloa.app/@{draft.username || '…'}</p>
                </div>
                <Input label={tx(ui.settings.role, locale)} value={text(draft.role, 'en')} onChange={(event) => setDraft((current) => (current ? { ...current, role: { en: event.target.value, ar: text(current.role, 'ar') } } : current))} />
                <Input
                  aria-label={`${tx(ui.settings.role, locale)} (AR)`}
                  dir="rtl"
                  value={text(draft.role, 'ar')}
                  onChange={(event) => setDraft((current) => (current ? { ...current, role: { en: text(current.role, 'en'), ar: event.target.value } } : current))}
                />
                <Textarea
                  label={tx(ui.settings.bio, locale)}
                  rows={4}
                  value={text(draft.bio, 'en')}
                  counter={{ value: text(draft.bio, 'en').length, max: 280 }}
                  onChange={(event) => setDraft((current) => (current ? { ...current, bio: { en: event.target.value, ar: text(current.bio, 'ar') } } : current))}
                />
                <Textarea
                  aria-label={`${tx(ui.settings.bio, locale)} (AR)`}
                  dir="rtl"
                  rows={4}
                  value={text(draft.bio, 'ar')}
                  onChange={(event) => setDraft((current) => (current ? { ...current, bio: { en: text(current.bio, 'en'), ar: event.target.value } } : current))}
                />
              </div>
            </Surface>

            <div className="space-y-5">
              <Surface className="p-5 sm:p-6">
                <SectionHeading icon={Globe2} title={tx(ui.settings.publication, locale)} help={tx(ui.settings.publishHelp, locale)} />
                <Switch
                  checked={draft.published}
                  onChange={(checked) => {
                    setDraft((current) => (current ? { ...current, published: checked } : current));
                    void repository.profiles.setPublished(draft.id, checked).then((result) => {
                      if (result.ok) loaded.setData(result.data);
                      else fail(result.error);
                    });
                  }}
                  label={draft.published ? tx(ui.common.published, locale) : tx(ui.common.draft, locale)}
                  description={`raloa.app/@${draft.username}`}
                />
                <AppLink to={`/p/${draft.username}`} external className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-indigo-700">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {tx(ui.common.open, locale)}
                </AppLink>
              </Surface>

              <Surface className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <SectionHeading icon={CloudUpload} title={tx(ui.settings.socials, locale)} help={tx(ui.settings.socialsHelp, locale)} />
                </div>
                <div className="mt-4 space-y-3">
                  {draft.socials.map((social) => (
                    <div key={social.id} className="rounded-control border border-slate-200 p-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={social.platform}
                          onChange={(event) => updateSocial(social.id, { platform: event.target.value })}
                          options={PLATFORMS.map((platform) => ({ value: platform, label: platform }))}
                          className="w-32"
                          aria-label={tx(ui.settings.platform, locale)}
                        />
                        <Input
                          aria-label={tx(ui.settings.link, locale)}
                          value={social.url}
                          onChange={(event) => updateSocial(social.id, { url: event.target.value })}
                          placeholder="https://"
                          className="min-w-0 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => setDraft((current) => (current ? { ...current, socials: current.socials.filter((item) => item.id !== social.id) } : current))}
                          aria-label={tx(ui.common.delete, locale)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <label className="mt-2 flex min-h-9 items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={social.enabled}
                          onChange={(event) => updateSocial(social.id, { enabled: event.target.checked })}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        {tx(ui.common.visible, locale)}
                      </label>
                    </div>
                  ))}
                  {!draft.socials.length && <p className="text-xs text-slate-500">{isRtl ? 'لا توجد روابط بعد.' : 'No social links yet.'}</p>}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? { ...current, socials: [...current.socials, { id: `social-${Date.now()}`, platform: 'instagram', url: 'https://', enabled: true }] }
                          : current
                      )
                    }
                  >
                    {tx(ui.settings.addSocial, locale)}
                  </Button>
                </div>
              </Surface>

              {usage.data && (
                <Surface className="p-5 sm:p-6">
                  <SectionHeading icon={Settings2} title={tx(ui.settings.limits, locale)} help={`${usage.data.plan} · ${tx(ui.common.unverified, locale)}`} />
                  <div className="mt-4 space-y-3">
                    <UsageBar label={tx(ui.settings.profilesUsed, locale)} used={usage.data.profilesUsed} limit={usage.data.profileLimit} />
                    <UsageBar label={tx(ui.settings.pagesUsed, locale)} used={usage.data.pagesUsed} limit={usage.data.pageLimit} />
                    <UsageBar label={tx(ui.settings.blocksUsed, locale)} used={usage.data.blocksUsed} limit={usage.data.blockLimit} />
                    <UsageBar label={tx(ui.settings.visitsUsed, locale)} used={usage.data.monthlyVisits} limit={usage.data.visitLimit} />
                  </div>
                </Surface>
              )}
            </div>
          </div>
        ) : (
          <SeoSettings draft={draft} setDraft={setDraft} locale={locale} />
        )}

        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">{tx(ui.common.demoNote, locale)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={autosave.reset} disabled={!autosave.dirty}>
              {tx(ui.common.discardChanges, locale)}
            </Button>
            <Button onClick={() => void autosave.saveNow()} disabled={!autosave.dirty || autosave.isSaving}>
              {autosave.isSaving ? tx(ui.common.saving, locale) : tx(ui.common.saveChanges, locale)}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

const SeoSettings: React.FC<{
  draft: PublicProfile;
  setDraft: React.Dispatch<React.SetStateAction<PublicProfile | null>>;
  locale: Locale;
}> = ({ draft, setDraft, locale }) => {
  const isRtl = locale === 'ar';
  const title = text(draft.seo.title, 'en');
  const description = text(draft.seo.description ?? draft.bio, 'en');
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (!title.trim()) list.push(isRtl ? 'عنوان ميتا فارغ.' : 'Meta title is empty.');
    else if (title.length > 60) list.push(isRtl ? 'عنوان ميتا أطول من ٦٠ حرفاً.' : 'Meta title is longer than 60 characters.');
    if (!description.trim()) list.push(isRtl ? 'الوصف الفارغ.' : 'Meta description is empty.');
    else if (description.length > 160) list.push(isRtl ? 'الوصف أطول من ١٦٠ حرفاً.' : 'Meta description is longer than 160 characters.');
    if (!draft.seo.ogImageUrl && !draft.avatarUrl) list.push(isRtl ? 'لا توجد صورة مشاركة.' : 'No social share image set.');
    return list;
  }, [title, description, draft.seo.ogImageUrl, draft.avatarUrl, isRtl]);

  const patchSeo = (patch: Partial<PublicProfile['seo']>) =>
    setDraft((current) => (current ? { ...current, seo: { ...current.seo, ...patch } } : current));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Surface className="p-5 sm:p-6">
        <SectionHeading icon={Search} title="SEO" help={isRtl ? 'ما يراه محرك البحث ومن يشارك الرابط.' : 'What search engines and people sharing the link see.'} />
        <div className="mt-5 space-y-4">
          <Input
            label={isRtl ? 'عنوان ميتا' : 'Meta title'}
            value={title}
            onChange={(event) => patchSeo({ title: { en: event.target.value, ar: text(draft.seo.title, 'ar') } })}
            hint={`${title.length}/60`}
          />
          <Textarea
            label={isRtl ? 'وصف ميتا' : 'Meta description'}
            rows={3}
            value={description}
            counter={{ value: description.length, max: 160 }}
            onChange={(event) => patchSeo({ description: { en: event.target.value, ar: text(draft.seo.description ?? '', 'ar') } })}
          />
          <Input
            label={isRtl ? 'رابط صورة المشاركة' : 'Social image URL'}
            value={draft.seo.ogImageUrl ?? ''}
            placeholder="https://"
            onChange={(event) => patchSeo({ ogImageUrl: event.target.value || undefined })}
          />
          <Switch
            checked={draft.seo.indexable !== false && draft.published}
            disabled={!draft.published}
            onChange={(checked) => patchSeo({ indexable: checked })}
            label={isRtl ? 'السماح بالظهور في محركات البحث' : 'Allow search engines'}
            description={draft.published ? 'robots: index,follow' : tx(ui.common.draft, locale)}
          />
          {warnings.length > 0 && (
            <ul className="space-y-1 rounded-control bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              {warnings.map((warning) => (
                <li key={warning}>· {warning}</li>
              ))}
            </ul>
          )}
        </div>
      </Surface>

      <Surface className="overflow-hidden">
        <p className="border-b border-slate-100 px-5 py-4 text-sm font-extrabold">{isRtl ? 'معاينة بطاقة المشاركة' : 'Social preview card'}</p>
        <div className="p-5">
          <div className="overflow-hidden rounded-control border border-slate-200 bg-white">
            <div className="flex h-40 items-center justify-center bg-slate-100">
              {draft.seo.ogImageUrl || draft.avatarUrl ? (
                <img src={draft.seo.ogImageUrl || draft.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-slate-400" aria-hidden="true" />
              )}
            </div>
            <div className="p-3">
              <p className="text-2xs uppercase tracking-wider text-slate-500">raloa.app</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{title || text(draft.displayName, locale)}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{description || tx(ui.settings.profileInfoHelp, locale)}</p>
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
};

const SectionHeading: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; help: string }> = ({ icon: Icon, title, help }) => (
  <div className="flex items-start gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-indigo-50 text-indigo-600">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div>
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{help}</p>
    </div>
  </div>
);

const UsageBar: React.FC<{ label: string; used: number; limit: number }> = ({ label, used, limit }) => {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span className="tabular-nums">{used} / {limit}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-pill ${pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const SaveChip: React.FC<{ autosave: ReturnType<typeof useAutosave>; locale: Locale }> = ({ autosave, locale }) => (
  <span
    className={`hidden items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-bold sm:flex ${
      autosave.status === 'failed' ? 'bg-rose-50 text-rose-700' : autosave.dirty ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
    }`}
    aria-live="polite"
  >
    {autosave.status === 'saving' ? tx(ui.common.saving, locale) : autosave.dirty ? tx(ui.common.unsaved, locale) : tx(ui.common.saved, locale)}
  </span>
);

const Shell: React.FC<{ locale: Locale; onReturnHome: () => void; title: string; children: React.ReactNode }> = ({ children, title }) => (
  <main aria-label={title} className="min-h-screen bg-surface-alt p-6">
    <div className="mx-auto max-w-md">{children}</div>
  </main>
);

const usernameMessage = (state: UsernameAvailability | 'checking' | 'idle', locale: Locale): string => {
  const map: Record<string, { en: string; ar: string }> = {
    taken: ui.settings.usernameTaken,
    reserved: ui.settings.usernameReserved,
    invalid: ui.settings.usernameInvalid
  };
  return map[state] ? tx(map[state], locale) : '';
};
