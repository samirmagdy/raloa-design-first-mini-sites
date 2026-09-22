import React, { useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  ArrowUpRight,
  Check,
  ChevronDown,
  Github,
  Instagram,
  Link2,
  Linkedin,
  Mail,
  Music2,
  Youtube
} from 'lucide-react';
import { Locale } from '../types';
import { mockRepository } from '../services/mockRepository';
import { ProfileBlock, PublicProfile } from '../services/repository';

interface PublicProfilePageProps {
  username: string;
  locale: Locale;
}

const socialIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" aria-hidden="true" />,
  youtube: <Youtube className="h-5 w-5" aria-hidden="true" />,
  linkedin: <Linkedin className="h-5 w-5" aria-hidden="true" />,
  github: <Github className="h-5 w-5" aria-hidden="true" />,
  spotify: <Music2 className="h-5 w-5" aria-hidden="true" />,
  email: <Mail className="h-5 w-5" aria-hidden="true" />,
  x: <AtSign className="h-5 w-5" aria-hidden="true" />
};

const socialLabels: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  spotify: 'Spotify',
  email: 'Email',
  x: 'X'
};

const ProfileLoadingState: React.FC = () => (
  <main className="min-h-screen bg-slate-100 px-4 py-10 sm:py-16" aria-busy="true" aria-label="Loading profile">
    <div className="mx-auto max-w-xl animate-pulse rounded-[2rem] bg-white p-6 shadow-xl sm:p-8">
      <div className="mx-auto h-24 w-24 rounded-full bg-slate-200" />
      <div className="mx-auto mt-5 h-7 w-40 rounded-full bg-slate-200" />
      <div className="mx-auto mt-3 h-4 w-64 rounded-full bg-slate-200" />
      <div className="mx-auto mt-8 h-12 w-48 rounded-full bg-slate-200" />
      <div className="mt-8 space-y-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-16 rounded-2xl bg-slate-100" />)}
      </div>
    </div>
  </main>
);

const ProfileMessageState: React.FC<{ title: string; body: string; action?: () => void; actionLabel?: string }> = ({
  title,
  body,
  action,
  actionLabel
}) => (
  <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-16 text-center">
    <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Link2 className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
      {action && actionLabel && (
        <button
          type="button"
          onClick={action}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {actionLabel}
        </button>
      )}
    </section>
  </main>
);

const ProfileBlockView: React.FC<{ block: ProfileBlock; locale: Locale; accent: string }> = ({ block, locale, accent }) => {
  if (!block.visible) return null;
  const title = block.title || (locale === 'ar' ? 'رابط' : 'Open link');
  const subtitle = block.subtitle;

  if (block.type === 'spacer') return <div aria-hidden="true" className="h-5" />;
  if (block.type === 'section') {
    return <h2 className="px-1 pt-3 text-start text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{title}</h2>;
  }

  return (
    <a
      href={block.url || '#'}
      target={block.url?.startsWith('http') ? '_blank' : undefined}
      rel={block.url?.startsWith('http') ? 'noreferrer' : undefined}
      className="group flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-3 text-start shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
        <Link2 className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-extrabold text-slate-900">{title}</strong>
        {subtitle && <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" aria-hidden="true" />
    </a>
  );
};

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ username, locale }) => {
  const isRtl = locale === 'ar';
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    setProfile(null);
    setAvatarFailed(false);

    mockRepository
      .getProfile(username)
      .then((result) => {
        if (!active) return;
        setProfile(result.data);
        setActivePageId(result.data?.pages[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username]);

  const activePage = useMemo(
    () => profile?.pages.find((page) => page.id === activePageId) ?? profile?.pages[0],
    [activePageId, profile]
  );

  if (isLoading) return <ProfileLoadingState />;
  if (loadError) {
    return (
      <ProfileMessageState
        title={isRtl ? 'تعذر تحميل الصفحة' : 'Profile unavailable'}
        body={isRtl ? 'حدث خطأ أثناء تحميل هذه الصفحة. حاول مرة أخرى.' : 'Something went wrong while loading this profile. Try again.'}
        action={() => window.location.reload()}
        actionLabel={isRtl ? 'إعادة المحاولة' : 'Try again'}
      />
    );
  }
  if (!profile) {
    return (
      <ProfileMessageState
        title={isRtl ? 'الصفحة غير موجودة' : 'Profile not found'}
        body={isRtl ? 'تأكد من اسم المستخدم وحاول مرة أخرى.' : `No public profile was found for @${username}.`}
      />
    );
  }
  if (!profile.published) {
    return (
      <ProfileMessageState
        title={isRtl ? 'الصفحة غير متاحة' : 'Profile unavailable'}
        body={isRtl ? 'هذه الصفحة غير منشورة حالياً.' : 'This profile is not published right now.'}
      />
    );
  }
  if (!activePage || activePage.blocks.filter((block) => block.visible).length === 0) {
    return (
      <ProfileMessageState
        title={isRtl ? 'لا يوجد محتوى بعد' : 'This page is still being built'}
        body={isRtl ? 'سيظهر المحتوى هنا عند نشر أول رابط.' : 'The creator has not published any links on this page yet.'}
      />
    );
  }

  const initials = profile.displayName.slice(0, 2).toUpperCase();
  const accent = profile.theme.accent;

  return (
    <main
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 sm:py-12"
      style={{
        backgroundColor: profile.theme.background,
        color: profile.theme.text,
        backgroundImage: profile.theme.backgroundImage ? `url(${profile.theme.backgroundImage})` : undefined
      }}
    >
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
          <header className="text-center">
            <div className="relative mx-auto h-24 w-24">
              {avatarFailed ? (
                <div className="flex h-full w-full items-center justify-center rounded-full text-2xl font-extrabold text-white" style={{ backgroundColor: accent }}>
                  {initials}
                </div>
              ) : (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.displayName} profile`}
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full rounded-full border-4 border-white object-cover shadow-lg"
                />
              )}
              {profile.verified && (
                <span className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm" aria-label={isRtl ? 'حساب موثق' : 'Verified profile'}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">{profile.displayName}</h1>
            <p className="mt-1 text-sm font-bold" style={{ color: accent }}>{isRtl ? profile.roleAr : profile.role}</p>
            <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">{isRtl ? profile.bioAr : profile.bio}</p>

            <p className="mt-4 text-sm font-semibold text-slate-500">raloa.app/@{profile.username}</p>

            <nav className="mt-5 flex flex-wrap justify-center gap-2" aria-label={isRtl ? 'روابط التواصل الاجتماعي' : 'Social links'}>
              {profile.socials.filter((social) => social.enabled).map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target={social.url.startsWith('http') ? '_blank' : undefined}
                  rel={social.url.startsWith('http') ? 'noreferrer' : undefined}
                  aria-label={socialLabels[social.platform] ?? social.platform}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {socialIcons[social.platform] ?? <Link2 className="h-5 w-5" aria-hidden="true" />}
                </a>
              ))}
            </nav>
          </header>

          {profile.pages.length > 1 && (
            <div className="relative mt-7">
              <label htmlFor="public-profile-page" className="sr-only">{isRtl ? 'اختر الصفحة' : 'Choose page'}</label>
              <select
                id="public-profile-page"
                value={activePage?.id}
                onChange={(event) => setActivePageId(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
              >
                {profile.pages.filter((page) => page.published).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-4 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
          )}

          <section className="mt-7 space-y-3" aria-label={activePage.title}>
            {activePage.blocks.map((block) => (
              <ProfileBlockView key={block.id} block={block} locale={locale} accent={accent} />
            ))}
          </section>
        </div>

        <footer className="pb-3 pt-6 text-center text-xs font-semibold text-slate-500">
          <a href="/" className="transition hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
            Built with RALOA
          </a>
        </footer>
      </div>
    </main>
  );
};

