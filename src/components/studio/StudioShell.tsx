import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CloudUpload,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Palette,
  Settings,
  Layers3,
  X
} from 'lucide-react';
import type { Locale } from '../../types';
import { navigate, type StudioSection } from '../../app/router';
import { useRepository, useSession } from '../../services/RepositoryContext';
import { useAsyncResource } from '../../services/useAsyncResource';
import { useAutosave } from '../../services/useAutosave';
import type { ProfilePage, PublicProfile, RepositoryError, ThemeConfig } from '../../services';
import { RaloaMark } from '../brand/RaloaLogo';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Surface } from '../ui/Surface';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '../ui/States';
import { useToast } from '../ui/Toast';
import { ui, text, tx } from '../../i18n/ui';
import { BlockEditorWorkspace } from './BlockEditorWorkspace';
import { ThemeEditor } from './ThemeEditor';
import { PagesWorkspace } from './PagesWorkspace';
import { StudioPreviewWorkspace } from './StudioPreviewWorkspace';

interface StudioShellProps {
  locale: Locale;
  section: StudioSection;
  onReturnHome: () => void;
}

const clone = <T,>(value: T): T => (typeof structuredClone === 'function' ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T));

const NAV: Array<{ id: StudioSection; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'editor', icon: FileText },
  { id: 'theme', icon: Palette },
  { id: 'pages', icon: Layers3 },
  { id: 'preview', icon: MonitorPlay }
];

const sectionLabel = (section: StudioSection, locale: Locale): string => {
  const map: Record<StudioSection, { en: string; ar: string }> = {
    overview: ui.studio.overview,
    editor: ui.studio.editor,
    theme: ui.studio.theme,
    pages: ui.studio.pages,
    preview: ui.studio.preview
  };
  return tx(map[section], locale);
};

export const StudioShell: React.FC<StudioShellProps> = ({ locale, section, onReturnHome }) => {
  const repository = useRepository();
  const toast = useToast();
  const isRtl = locale === 'ar';
  const { status } = useSession();

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pages, setPages] = useState<ProfilePage[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const profiles = useAsyncResource(() => repository.profiles.list(), []);

  const document_ = useAsyncResource(
    async () => {
      const list = await repository.profiles.list();
      if (!list.ok) return list;
      const active = await repository.profiles.activeId();
      if (!active.ok) return active;
      const wanted = activeProfileId ?? active.data ?? list.data[0]?.id ?? '';
      const profileResult = await repository.profiles.get(wanted);
      if (!profileResult.ok) return profileResult;
      if (!profileResult.data) return { ok: true as const, data: null };
      const pagesResult = await repository.pages.list(profileResult.data.id);
      if (!pagesResult.ok) return pagesResult;
      return { ok: true as const, data: { profile: profileResult.data, pages: pagesResult.data } };
    },
    [activeProfileId],
    { enabled: status === 'signed-in' }
  );

  useEffect(() => {
    if (!document_.data) return;
    setProfile(clone(document_.data.profile));
    setPages(clone(document_.data.pages));
    setActivePageId((current) => current ?? document_.data!.pages[0]?.id ?? null);
  }, [document_.data]);

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? pages[0] ?? null,
    [activePageId, pages]
  );

  const savedIdentity = document_.data?.profile ?? null;

  /** Identity + theme edits are a debounce-save document; blocks are written per action. */
  const identity = useMemo(
    () =>
      profile
        ? { displayName: profile.displayName, role: profile.role, bio: profile.bio, avatarUrl: profile.avatarUrl, seo: profile.seo, socials: profile.socials }
        : null,
    [profile]
  );
  const savedIdentityFields = useMemo(
    () =>
      savedIdentity
        ? { displayName: savedIdentity.displayName, role: savedIdentity.role, bio: savedIdentity.bio, avatarUrl: savedIdentity.avatarUrl, seo: savedIdentity.seo, socials: savedIdentity.socials }
        : null,
    [savedIdentity]
  );

  const autosave = useAutosave({
    draft: { identity, theme: profile?.theme ?? null },
    saved: { identity: savedIdentityFields, theme: savedIdentity?.theme ?? null },
    enabled: Boolean(profile && savedIdentity),
    persist: async (draft) => {
      if (!profile || !draft.identity || !draft.theme) return { ok: true as const, data: null };
      const identityResult = await repository.profiles.update(profile.id, draft.identity, profile.version);
      if (!identityResult.ok) return identityResult;
      const themeResult = await repository.themes.save(profile.id, draft.theme, identityResult.data.version);
      if (!themeResult.ok) return themeResult;
      setProfile((current) => (current ? { ...current, ...draft.identity, theme: themeResult.data, version: identityResult.data.version } : current));
      setPages((current) => current.map((page) => ({ ...page })));
      document_.setData((current) =>
        current ? { profile: { ...current.profile, ...draft.identity, theme: themeResult.data, version: identityResult.data.version }, pages: current.pages } : current
      );
      return { ok: true as const, data: themeResult.data };
    },
    onReset: () => {
      if (!document_.data) return;
      setProfile(clone(document_.data.profile));
      setPages(clone(document_.data.pages));
    }
  });

  const fail = useCallback(
    (error: RepositoryError, retry?: () => void) => {
      const run = retry ?? (() => void autosave.retry());
      toast({
        title: tx(ui.common.saveFailed, locale),
        message: text(error.message, locale),
        tone: 'error',
        action: error.retryable ? { label: tx(ui.common.retry, locale), onClick: run } : undefined
      });
    },
    [toast, locale, autosave]
  );

  const updateProfile = (patch: Partial<PublicProfile>) => setProfile((current) => (current ? { ...current, ...patch } : current));

  const replacePage = (nextPage: ProfilePage) => setPages((current) => current.map((page) => (page.id === nextPage.id ? nextPage : page)));

  const publish = async () => {
    if (!profile || !activePage) return;
    await autosave.saveNow();
    const pageResult = await repository.pages.setPublished(activePage.id, true);
    if (!pageResult.ok) return fail(pageResult.error);
    const profileResult = await repository.profiles.setPublished(profile.id, true);
    if (!profileResult.ok) return fail(profileResult.error);
    setProfile((current) => (current ? { ...current, published: true, version: profileResult.data.version } : current));
    replacePage(pageResult.data);
    document_.setData((current) => (current ? { profile: profileResult.data, pages: current.pages.map((page) => (page.id === pageResult.data.id ? pageResult.data : page)) } : current));
    toast({ title: tx(ui.studio.publishedToast, locale), message: tx(ui.studio.publishedToastBody, locale), tone: 'success' });
  };

  const selectProfile = async (profileId: string) => {
    const saved = await autosave.saveNow();
    if (!saved) toast({ title: tx(ui.common.unsaved, locale), message: isRtl ? 'لم يُحفظ تعديلك بعد.' : 'Your edits are not saved yet.', tone: 'error' });
    setActiveProfileId(profileId);
    setActivePageId(null);
    // The loader keys off `activeProfileId`, so setting it above already refetches; this only makes
    // the choice stick for plan usage and for the next screen that opens the studio.
    void repository.profiles.setActive(profileId);
  };

  if (status === 'loading') return <LoadingState label={tx(ui.common.loading, locale)} variant="card" />;

  if (status === 'signed-out') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-alt p-6">
        <EmptyState
          icon={CloudUpload}
          title={tx(ui.auth.signInRequired, locale)}
          body={tx(ui.auth.demoNotice, locale)}
          action={{ label: tx(ui.auth.signIn, locale), onClick: () => navigate('/signin') }}
          secondaryAction={{ label: tx(ui.studio.backToWebsite, locale), onClick: onReturnHome }}
        />
      </main>
    );
  }

  if (profiles.isLoading || document_.isLoading) {
    return (
      <main className="min-h-screen bg-surface-alt p-4 sm:p-6">
        <div className="mx-auto max-w-[1400px]">
          <LoadingState label={tx(ui.common.loading, locale)} variant="card" />
        </div>
      </main>
    );
  }

  if (profiles.error || document_.error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-alt p-6">
        <div className="w-full max-w-md">
          <ErrorState
            title={tx(ui.studio.cannotLoad, locale)}
            body={text(document_.error?.message ?? profiles.error?.message ?? ui.studio.cannotLoadBody, locale)}
            onRetry={() => {
              profiles.reload();
              document_.reload();
            }}
            retryLabel={tx(ui.common.retry, locale)}
            action={{ label: tx(ui.studio.backToWebsite, locale), onClick: onReturnHome }}
          />
        </div>
      </main>
    );
  }

  const saveLabel =
    autosave.status === 'saving'
      ? tx(ui.common.saving, locale)
      : autosave.status === 'failed'
        ? tx(ui.common.saveFailed, locale)
        : autosave.dirty
          ? tx(ui.common.saveChanges, locale)
          : tx(ui.common.saved, locale);

  return (
    <main dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-surface-alt text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
            aria-label={tx(ui.studio.closeNav, locale)}
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 start-0 z-40 flex w-[280px] flex-col border-e border-slate-200 bg-white p-5 shadow-xl transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between">
            <a href="/" onClick={(event) => { event.preventDefault(); onReturnHome(); }} className="flex items-center gap-2 text-sm font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-ink">
                <RaloaMark size={25} theme="on-dark" />
              </span>
              <span>{tx(ui.studio.title, locale)}</span>
            </a>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label={tx(ui.studio.closeNav, locale)}
              className="flex h-11 w-11 items-center justify-center rounded-pill text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-8 rounded-panel border border-slate-200 bg-surface-alt p-3">
            <Select
              name="studio-profile"
              label={tx(ui.studio.switchProfile, locale)}
              value={profile.id}
              onChange={(event) => void selectProfile(event.target.value)}
              options={(profiles.data ?? []).map((item) => ({ value: item.id, label: `@${item.username}` }))}
            />
          </div>

          <nav className="mt-8 space-y-1" aria-label={tx(ui.studio.navLabel, locale)}>
            {NAV.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={section === id ? 'page' : undefined}
                onClick={() => {
                  navigate(`/studio/${id}`);
                  setMobileNavOpen(false);
                }}
                className={`flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-bold transition ${
                  section === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {sectionLabel(id, locale)}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => navigate('/settings/profile')}
              className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              {tx(ui.studio.settings, locale)}
            </button>
            <button
              type="button"
              onClick={onReturnHome}
              className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {tx(ui.studio.backToWebsite, locale)}
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label={tx(ui.studio.openNav, locale)}
                className="flex h-11 w-11 items-center justify-center rounded-control text-slate-700 hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-base font-extrabold sm:text-lg">{sectionLabel(section, locale)}</h1>
                <p className="truncate text-xs text-slate-500">raloa.app/@{profile.username}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <SaveIndicator autosave={autosave} locale={locale} onRetry={() => void autosave.retry()} />
              <Button size="sm" variant="secondary" onClick={() => navigate('/analytics')}>
                {tx(ui.settings.heading, locale)}
              </Button>
              <Button size="sm" variant={profile.published ? 'secondary' : 'primary'} onClick={() => void publish()}>
                {profile.published ? tx(ui.studio.publishChanges, locale) : tx(ui.studio.publishPage, locale)}
              </Button>
            </div>
          </header>

          <div className="mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{tx(ui.studio.workspace, locale)}</p>
                <h2 className="mt-2 truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{profile.displayName}</h2>
                <p className="mt-1 truncate text-sm text-slate-600">{text(profile.role, locale)}</p>
              </div>
              <Select
                name="studio-page"
                label={tx(ui.common.page, locale)}
                value={activePage?.id ?? ''}
                onChange={(event) => setActivePageId(event.target.value)}
                options={pages.map((page) => ({ value: page.id, label: text(page.title, locale) }))}
                className="sm:w-64"
              />
            </div>

            {section === 'overview' && (
              <OverviewPanel profile={profile} page={activePage} locale={locale} pages={pages} onEdit={() => navigate('/studio/editor')} />
            )}
            {section === 'editor' && activePage && (
              <BlockEditorWorkspace
                page={activePage}
                profile={profile}
                locale={locale}
                onPagesChange={setPages}
                onError={fail}
              />
            )}
            {section === 'theme' && (
              <ThemeEditor theme={profile.theme} locale={locale} onChange={(theme: ThemeConfig) => updateProfile({ theme })} onReset={autosave.reset} />
            )}
            {section === 'pages' && (
              <PagesWorkspace
                profile={profile}
                pages={pages}
                locale={locale}
                activePageId={activePage?.id ?? ''}
                onPagesChange={setPages}
                onError={fail}
                onOpenPage={(pageId) => {
                  setActivePageId(pageId);
                  navigate('/studio/editor');
                }}
              />
            )}
            {section === 'preview' && (
              <StudioPreviewWorkspace profile={profile} page={activePage} locale={locale} onPublish={publish} onReload={document_.reload} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className="text-xs text-slate-500">{tx(ui.common.demoNote, locale)}</p>
              {autosave.dirty && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)}>
                  {tx(ui.common.discardChanges, locale)}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={tx(ui.common.discardTitle, locale)}
        body={tx(ui.common.discardBody, locale)}
        confirm={{ label: tx(ui.common.discard, locale), tone: 'danger' }}
        cancelLabel={tx(ui.common.cancel, locale)}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          autosave.reset();
          setConfirmDiscard(false);
          toast({ title: tx(ui.common.discard, locale), message: isRtl ? 'استعيدت آخر نسخة محفوظة.' : 'The last saved version is active.', tone: 'info' });
        }}
      />
    </main>
  );
};

const SaveIndicator: React.FC<{
  autosave: ReturnType<typeof useAutosave>;
  locale: Locale;
  onRetry: () => void;
}> = ({ autosave, locale, onRetry }) => {
  const tone =
    autosave.status === 'failed' ? 'text-rose-700' : autosave.dirty ? 'text-amber-700' : autosave.isSaving ? 'text-indigo-700' : 'text-emerald-700';
  const dot = autosave.status === 'failed' ? 'bg-rose-500' : autosave.dirty ? 'bg-amber-500' : autosave.isSaving ? 'bg-indigo-500' : 'bg-emerald-500';

  return (
    <span className={`hidden items-center gap-2 text-xs font-bold sm:flex ${tone}`} aria-live="polite">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {autosave.status === 'failed' ? (
        <button type="button" onClick={onRetry} className="underline underline-offset-2">
          {`${autosave.error?.message ? text(autosave.error.message, locale) : ''} · ${tx(ui.common.retry, locale)}`}
        </button>
      ) : (
        autosave.status === 'saving'
          ? tx(ui.common.saving, locale)
          : autosave.dirty
            ? tx(ui.common.unsaved, locale)
            : autosave.lastSavedAt
            ? tx(ui.common.saved, locale)
            : tx(ui.common.demoNote, locale)
      )}
    </span>
  );
};

const OverviewPanel: React.FC<{
  profile: PublicProfile;
  page: ProfilePage | null;
  pages: ProfilePage[];
  locale: Locale;
  onEdit: () => void;
}> = ({ profile, page, pages, locale, onEdit }) => (
  <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
    <Surface className="p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-panel object-cover" />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold">{profile.displayName}</h3>
          <p className="truncate text-sm text-slate-500">raloa.app/@{profile.username}</p>
        </div>
      </div>
      <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600">{text(profile.bio, locale)}</p>
      <Button className="mt-5" onClick={onEdit}>
        {tx(ui.studio.openEditor, locale)}
      </Button>
    </Surface>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
      <Metric label={tx(ui.common.pages, locale)} value={String(pages.length)} />
      <Metric label={tx(ui.studio.visibleBlocks, locale)} value={String(page?.blocks.filter((block) => block.visible && !block.parentId).length ?? 0)} />
      <Metric label={tx(ui.common.published, locale)} value={profile.published ? tx(ui.common.published, locale) : tx(ui.common.draft, locale)} />
      <Metric label={tx(ui.studio.lastUpdated, locale)} value={new Date(profile.updatedAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB')} />
    </div>
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Surface className="p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-2 truncate text-xl font-extrabold text-ink">{value}</p>
  </Surface>
);
