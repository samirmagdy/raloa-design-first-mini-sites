import React, { useEffect, useMemo, useState } from 'react';
import type { Locale } from '../types';
import { useRepository } from '../services/RepositoryContext';
import { useAsyncResource } from '../services/useAsyncResource';
import type { ProfileBlock, ProfilePage, PublicProfile, UtmParams } from '../services';
import { LoadingState, ErrorState, EmptyState } from './ui/States';
import { ProfileView } from './profile/ProfileView';
import { ui, text, tx } from '../i18n/ui';

interface PublicProfilePageProps {
  username: string;
  locale: Locale;
  onReturnHome?: () => void;
}

const PUBLIC_VISIBILITY: ProfilePage['visibility'][] = ['public', 'unlisted'];

/** Per-tab id: a reload within a visit must not count as a new unique visitor. */
const visitorKey = (): string => {
  const existing = window.sessionStorage.getItem('raloa.visitor');
  if (existing) return existing;
  const created = `vst_${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem('raloa.visitor', created);
  return created;
};

/** Read once per document: a campaign link keeps its attribution for the whole visit. */
const utmFromLocation = (): UtmParams | undefined => {
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
    term: params.get('utm_term') || undefined,
    content: params.get('utm_content') || undefined
  };
  return Object.values(utm).some(Boolean) ? utm : undefined;
};

const sessionUtm = utmFromLocation();

/**
 * The read path: profile + its published pages in one resource, a view event recorded per visit,
 * and the four non-happy states kept distinct because they mean different things to a visitor.
 */
export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ username, locale, onReturnHome }) => {
  const repository = useRepository();
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const resource = useAsyncResource(
    async () => {
      const profileResult = await repository.profiles.getByUsername(username);
      if (!profileResult.ok) return profileResult;
      const profile = profileResult.data;
      if (!profile) return { ok: true as const, data: null };
      const pagesResult = await repository.pages.list(profile.id);
      if (!pagesResult.ok) return pagesResult;
      return { ok: true as const, data: { profile, pages: pagesResult.data } };
    },
    [username],
    { enabled: Boolean(username) }
  );

  const payload = resource.data;
  const profile = payload?.profile ?? null;
  const pages = payload?.pages ?? [];

  useEffect(() => {
    setActivePageId(null);
  }, [username]);

  const visiblePages = useMemo(
    () => pages.filter((page) => page.published && PUBLIC_VISIBILITY.includes(page.visibility)),
    [pages]
  );

  const activePage = useMemo(
    () => visiblePages.find((page) => page.id === activePageId) ?? visiblePages[0] ?? null,
    [activePageId, visiblePages]
  );

  // A visit is only recorded once the page actually rendered; retrying a failed load must not inflate views.
  useEffect(() => {
    if (!profile?.published || !activePage) return;
    void repository.analytics.record({
      profileId: profile.id,
      pageId: activePage.id,
      type: 'view',
      visitorKey: visitorKey(),
      utm: sessionUtm,
      referrer: typeof document === 'undefined' ? undefined : document.referrer ? new URL(document.referrer).host : undefined
    });
  }, [profile, activePage, repository]);

  const recordClick = (block: ProfileBlock) => {
    if (!profile?.published || !activePage) return;
    void repository.analytics.record({
      profileId: profile.id,
      pageId: activePage.id,
      blockId: block.id,
      type: 'click',
      visitorKey: visitorKey(),
      utm: sessionUtm
    });
  };

  useEffect(() => {
    if (!profile) return;
    const title = text(profile.seo.title, locale, `${profile.displayName} — RALOA`);
    document.title = profile.seo.indexable === false ? `${title}` : title;
    const setMeta = (selector: string, attribute: string, key: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', text(profile.seo.description ?? profile.bio, locale));
    setMeta('meta[property="og:image"]', 'property', 'og:image', profile.seo.ogImageUrl ?? profile.avatarUrl);
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      profile.seo.indexable === false || !profile.published ? 'noindex,nofollow' : 'index,follow'
    );
  }, [profile, locale]);

  if (resource.isLoading) {
    return (
      <Fullscreen label={tx(ui.common.loading, locale)}>
        <LoadingState label={tx(ui.common.loading, locale)} variant="profile" />
      </Fullscreen>
    );
  }

  if (resource.error) {
    return (
      <Fullscreen label={tx(ui.preview.loadFailedTitle, locale)}>
        <ErrorState
          title={tx(ui.preview.loadFailedTitle, locale)}
          body={text(resource.error.message, locale)}
          onRetry={resource.retry}
          retryLabel={tx(ui.common.retry, locale)}
        />
      </Fullscreen>
    );
  }

  if (!profile) {
    return (
      <Fullscreen label={tx(ui.preview.notFoundTitle, locale)}>
        <EmptyState
          title={tx(ui.preview.notFoundTitle, locale)}
          body={tx(ui.preview.notFoundBody, locale).replace('{username}', username)}
        />
      </Fullscreen>
    );
  }

  if (!profile.published || !visiblePages.length || !activePage) {
    return (
      <Fullscreen label={tx(ui.preview.privateTitle, locale)}>
        <EmptyState
          title={profile.published ? tx(ui.preview.emptyTitle, locale) : tx(ui.preview.privateTitle, locale)}
          body={profile.published ? tx(ui.preview.emptyBody, locale) : tx(ui.preview.privateBody, locale)}
        />
      </Fullscreen>
    );
  }

  return <ProfileView profile={profile} page={activePage} locale={locale} pages={visiblePages} onSelectPage={setActivePageId} onBlockClick={recordClick} onReturnHome={onReturnHome} />;
};

const Fullscreen: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <main aria-label={label} className="min-h-screen bg-surface-alt px-4 py-10 sm:px-6 sm:py-16">
    <div className="mx-auto max-w-xl">{children}</div>
  </main>
);
