import React, { useMemo, useState } from 'react';
import { AtSign, Check, ChevronDown, Github, Globe2, Instagram, Linkedin, Link2, Mail, Music2, Youtube } from 'lucide-react';
import type { Locale } from '../../types';
import type { ProfileBlock, ProfilePage, PublicProfile } from '../../services';
import { themeToCssVariables } from '../../theme/themeRegistry';
import { ProfileBlockView } from './BlockRenderer';
import { text } from '../../i18n/ui';
import type { CSSProperties } from 'react';

const socialIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" aria-hidden="true" />,
  youtube: <Youtube className="h-5 w-5" aria-hidden="true" />,
  linkedin: <Linkedin className="h-5 w-5" aria-hidden="true" />,
  github: <Github className="h-5 w-5" aria-hidden="true" />,
  spotify: <Music2 className="h-5 w-5" aria-hidden="true" />,
  tiktok: <Music2 className="h-5 w-5" aria-hidden="true" />,
  email: <Mail className="h-5 w-5" aria-hidden="true" />,
  x: <AtSign className="h-5 w-5" aria-hidden="true" />
};

const socialLabels: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  spotify: 'Spotify',
  tiktok: 'TikTok',
  email: 'Email',
  x: 'X'
};

export interface ProfileViewProps {
  profile: PublicProfile;
  page: ProfilePage;
  locale: Locale;
  /** Pages the visitor may switch between; the caller decides which ones qualify. */
  pages?: ProfilePage[];
  onSelectPage?: (pageId: string) => void;
  /** `preview` never navigates and never shows the branding link. */
  variant?: 'public' | 'preview';
  onBlockClick?: (block: ProfileBlock) => void;
  onReturnHome?: () => void;
}

/**
 * One component renders a profile for the public route and for the Studio preview, so the two can
 * no longer drift — Phase 6's "preview matches the editor" gate depends on this being the only tree.
 */
export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  page,
  locale,
  pages,
  onSelectPage,
  variant = 'public',
  onBlockClick,
  onReturnHome
}) => {
  const isRtl = locale === 'ar';
  const [avatarFailed, setAvatarFailed] = useState(false);
  const theme = profile.theme;
  const accent = theme.accent;
  const initials = useMemo(() => profile.displayName.trim().slice(0, 2).toUpperCase() || 'R', [profile.displayName]);
  const switchable = (pages ?? []).filter((item) => item.published);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="relative isolate overflow-hidden px-4 py-8 sm:px-6 sm:py-12"
      style={
        {
          ...themeToCssVariables(theme),
          // The preview lives in a fixed-height device frame; the public route must fill the viewport itself.
          minHeight: variant === 'public' ? '100dvh' : '100%',
          backgroundColor: theme.background,
          color: theme.text,
          fontFamily: 'var(--profile-font)',
          backgroundImage: theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } as CSSProperties
      }
    >
      {theme.backgroundVideo && (
        <video
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
          src={theme.backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
      {theme.overlay && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-slate-950"
          style={{ opacity: theme.overlay.opacity, backdropFilter: `blur(${theme.overlay.blur}px)` }}
          aria-hidden="true"
        />
      )}

      <div className="mx-auto w-full max-w-xl">
        <div
          className="relative border p-5 backdrop-blur-xl sm:p-8"
          style={{
            backgroundColor: theme.card,
            color: theme.text,
            borderRadius: 'var(--profile-card-radius)',
            borderColor: theme.cardStyle?.border === 'none' ? 'transparent' : 'rgba(148,163,184,0.3)',
            borderWidth: 'var(--profile-card-border)',
            boxShadow: 'var(--profile-card-shadow)'
          }}
        >
          <header className="text-center">
            <div className="relative mx-auto h-24 w-24">
              {avatarFailed || !profile.avatarUrl ? (
                <div
                  role="img"
                  aria-label={`${profile.displayName} avatar`}
                  className="flex h-full w-full items-center justify-center rounded-full text-2xl font-extrabold text-white"
                  style={{ backgroundColor: accent }}
                >
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
                <span
                  className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm"
                  aria-label={isRtl ? 'حساب موثق' : 'Verified profile'}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </div>

            <h1 className="mt-5 font-extrabold tracking-tight" style={{ fontSize: 'var(--profile-title)' }}>
              {profile.displayName}
            </h1>
            <p className="mt-1 text-sm font-bold" style={{ color: accent }}>
              {text(profile.role, locale)}
            </p>
            <p
              className="mx-auto mt-3 max-w-md whitespace-pre-line leading-relaxed"
              style={{ color: theme.mutedText, fontSize: 'var(--profile-body)' }}
            >
              {text(profile.bio, locale)}
            </p>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold" style={{ color: theme.mutedText }}>
              <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
              raloa.app/@{profile.username}
              {page.slug !== 'links' && <span className="opacity-70">/{page.slug}</span>}
            </p>

            {profile.socials.filter((social) => social.enabled).length > 0 && (
              <nav className="mt-5 flex flex-wrap justify-center gap-2" aria-label={isRtl ? 'روابط التواصل الاجتماعي' : 'Social links'}>
                {profile.socials.filter((social) => social.enabled).map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target={/^https?:/i.test(social.url) ? '_blank' : undefined}
                    rel={/^https?:/i.test(social.url) ? 'noreferrer' : undefined}
                    aria-label={socialLabels[social.platform] ?? social.platform}
                    className="flex h-11 w-11 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
                    style={{ borderColor: 'rgba(148,163,184,0.35)' }}
                  >
                    {socialIcons[social.platform] ?? <Link2 className="h-5 w-5" aria-hidden="true" />}
                  </a>
                ))}
              </nav>
            )}
          </header>

          {switchable.length > 1 && (
            <div className="relative mt-7">
              <label htmlFor={`profile-pages-${page.id}`} className="sr-only">
                {isRtl ? 'اختر الصفحة' : 'Choose page'}
              </label>
              <select
                id={`profile-pages-${page.id}`}
                value={page.id}
                onChange={(event) => onSelectPage?.(event.target.value)}
                className="min-h-11 w-full appearance-none rounded-control border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
              >
                {switchable.map((item) => (
                  <option key={item.id} value={item.id}>
                    {text(item.title, locale)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-4 top-3.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
          )}

          <section className="mt-7 space-y-3" aria-label={text(page.title, locale)}>
            {page.blocks
              .filter((block) => !block.parentId)
              .map((block) => (
                <ProfileBlockView key={block.id} block={block} locale={locale} theme={theme} onBlockClick={onBlockClick} />
              ))}
          </section>
        </div>

        {theme.branding?.showFooter !== false && (
          <footer className="pb-3 pt-6 text-center text-xs font-semibold" style={{ color: theme.mutedText }}>
            {variant === 'public' ? (
              <a
                href="/"
                onClick={(event) => {
                  if (!onReturnHome) return;
                  event.preventDefault();
                  onReturnHome();
                }}
                className="rounded transition hover:opacity-80"
              >
                {isRtl ? 'صُنع برالوا' : 'Built with RALOA'}
              </a>
            ) : (
              <span>{isRtl ? 'صُنع برالوا' : 'Built with RALOA'}</span>
            )}
          </footer>
        )}
      </div>
    </div>
  );
};
