import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Link2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Play,
  Star,
  Tag
} from 'lucide-react';
import type { Locale } from '../../types';
import type { ProfileBlock } from '../../services/contracts/block';
import { isBlockInWindow } from '../../services/contracts/block';
import { getBlockDefinition } from '../../services/contracts/blockRegistry';
import type { ThemeConfig } from '../../services/contracts/theme';
import { text } from '../../i18n/ui';
import { FormBlockView } from './FormBlockView';
import { MediaBlockView } from './MediaBlockView';
import { safeBlockUrl, sanitizeRichText, isEmbedUrlAllowed } from './blockHelpers';

export interface BlockViewProps {
  block: ProfileBlock;
  locale: Locale;
  theme: ThemeConfig;
  /** Nested blocks render inside their folder/gate without a page-level wrapper. */
  depth?: number;
  /** Fires for the block whose link was activated, so the caller can record a click event. */
  onBlockClick?: (block: ProfileBlock) => void;
}

const useStrings = (locale: Locale) =>
  useMemo(
    () => ({
      openLink: locale === 'ar' ? 'افتح الرابط' : 'Open link',
      viewProduct: locale === 'ar' ? 'عرض المنتج' : 'View product',
      book: locale === 'ar' ? 'احجز موعداً' : 'Book a slot',
      subscribe: locale === 'ar' ? 'اشترك' : 'Subscribe',
      send: locale === 'ar' ? 'إرسال' : 'Send message',
      unlocked: locale === 'ar' ? 'تم فتح المحتوى التجريبي.' : 'Demo content unlocked.',
      protectedTitle: locale === 'ar' ? 'محتوى محمي' : 'Protected content',
      password: locale === 'ar' ? 'كلمة المرور' : 'Password',
      unlock: locale === 'ar' ? 'فتح المحتوى' : 'Unlock',
      demo: locale === 'ar' ? 'وضع تجريبي' : 'Demo mode',
      unavailable: locale === 'ar' ? 'رابط التضمين غير متاح.' : 'This embed URL is not supported.',
      showMore: locale === 'ar' ? 'عرض' : 'Show'
    }),
    [locale]
  );

const PasswordGate: React.FC<BlockViewProps> = ({ block, locale, theme, onBlockClick }) => {
  const strings = useStrings(locale);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [wrong, setWrong] = useState(false);
  const expected = typeof block.config.password === 'string' ? block.config.password : 'raloa-demo';
  const children = block.children ?? [];

  if (unlocked) {
    return (
      <section className="space-y-3 rounded-card border border-slate-200 bg-white/85 p-4">
        {block.content && <p className="text-sm text-slate-600">{text(block.content, locale)}</p>}
        {children.length ? (
          children.map((child) => <ProfileBlockView key={child.id} block={child} locale={locale} theme={theme} depth={1} onBlockClick={onBlockClick} />)
        ) : (
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <Check className="h-4 w-4" aria-hidden="true" />
            {strings.unlocked}
          </p>
        )}
      </section>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (password === expected) setUnlocked(true);
        else setWrong(true);
      }}
      className="rounded-card border border-slate-200 bg-white p-5 text-start shadow-[var(--profile-button-shadow)]"
    >
      <LockKeyhole className="h-5 w-5" style={{ color: theme.accent }} aria-hidden="true" />
      <h3 className="mt-3 text-sm font-extrabold text-slate-900">{text(block.title, locale, strings.protectedTitle)}</h3>
      {block.content && <p className="mt-1 text-xs text-slate-500">{text(block.content, locale)}</p>}
      <label className="sr-only" htmlFor={`gate-${block.id}`}>
        {strings.password}
      </label>
      <input
        id={`gate-${block.id}`}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setWrong(false);
        }}
        type="password"
        autoComplete="off"
        placeholder={strings.password}
        aria-invalid={wrong}
        className="mt-3 min-h-11 w-full rounded-control border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
      />
      <button
        type="submit"
        className="mt-3 min-h-11 w-full rounded-pill text-sm font-bold text-white transition hover:opacity-90"
        style={{ backgroundColor: theme.accent }}
      >
        {strings.unlock}
      </button>
      {wrong && (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">
          {locale === 'ar' ? 'كلمة المرور غير صحيحة.' : 'That password is not right.'}
        </p>
      )}
      <p className="mt-2 text-2xs text-slate-500">{strings.demo}</p>
    </form>
  );
};

export const ProfileBlockView: React.FC<BlockViewProps> = ({ block, locale, theme, depth = 0, onBlockClick }) => {
  const strings = useStrings(locale);
  const definition = getBlockDefinition(block.type);
  const isRtl = locale === 'ar';
  const accent = theme.accent;

  if (!block.visible || !isBlockInWindow(block.schedule)) return null;

  const title = text(block.title, locale, strings.openLink);
  const subtitle = text(block.subtitle, locale);
  const badge = block.badge?.label ? text(block.badge.label, locale) : '';

  const shell = (children: React.ReactNode, key?: string) => {
    const inner =
      block.emphasis === 'highlight' ? (
        <div className="rounded-card p-[3px]" style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}>
          <div className="rounded-[calc(var(--profile-card-radius)-2px)]" style={{ backgroundColor: theme.card }}>
            {children}
          </div>
        </div>
      ) : (
        children
      );
    return (
      <div
        key={key ?? block.id}
        data-block-id={block.id}
        className={badge ? 'relative' : undefined}
        onClick={(event) => {
          if (!(event.target instanceof Element)) return;
          const owner = event.target.closest('[data-block-id]');
          if (owner?.getAttribute('data-block-id') === block.id && event.target.closest('a[href]')) onBlockClick?.(block);
        }}
      >
        {inner}
        {badge && (
          <span
            className="absolute -top-2 rounded-pill px-2 py-0.5 text-2xs font-extrabold text-white shadow-sm"
            style={{ [isRtl ? 'right' : 'left']: '1rem', backgroundColor: accent } as React.CSSProperties}
          >
            {badge}
          </span>
        )}
      </div>
    );
  };

  switch (definition?.rendererKey ?? block.type) {
    case 'spacer':
      return (
        <div
          aria-hidden="true"
          className="w-full"
          style={{ height: `${typeof block.config.height === 'number' ? block.config.height : 24}px` }}
        />
      );

    case 'section':
      return (
        <h2 className="px-1 pt-3 text-start text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: theme.mutedText }}>
          {title}
        </h2>
      );

    case 'rich-text':
      return shell(
        <div
          className="rounded-card border p-5 text-start leading-relaxed"
          style={{
            backgroundColor: theme.card,
            color: theme.text,
            borderColor: theme.button.variant === 'outline' ? theme.accent : 'rgba(148,163,184,0.28)',
            borderRadius: 'var(--profile-card-radius)',
            boxShadow: 'var(--profile-card-shadow)',
            fontSize: 'var(--profile-body)'
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(text(block.content, locale)) }}
        />
      );

    case 'folder':
      return (
        <details open={block.config.expanded === true} className="group rounded-card border" style={{ borderColor: 'rgba(148,163,184,0.35)' }}>
          <summary
            className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 font-extrabold"
            style={{ color: theme.text, borderRadius: 'var(--profile-card-radius)', backgroundColor: theme.card }}
          >
            <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
            {subtitle && <span className="hidden truncate text-xs font-medium sm:block" style={{ color: theme.mutedText }}>{subtitle}</span>}
            <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" style={{ color: theme.mutedText }} aria-hidden="true" />
          </summary>
          <div className="space-y-3 border-t p-3" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
            {(block.children ?? []).map((child) => (
              <ProfileBlockView key={child.id} block={child} locale={locale} theme={theme} depth={depth + 1} onBlockClick={onBlockClick} />
            ))}
            {(block.children ?? []).length === 0 && (
              <p className="px-1 py-2 text-xs" style={{ color: theme.mutedText }}>
                {isRtl ? 'لا توجد روابط داخل هذا المجلد.' : 'This folder has no links yet.'}
              </p>
            )}
          </div>
        </details>
      );

    case 'embed': {
      const url = typeof block.config.embedUrl === 'string' ? block.config.embedUrl : block.url ?? '';
      const hosts = definition?.fields.find((field) => field.key === 'embedUrl')?.embedHosts ?? [];
      if (!url || !isEmbedUrlAllowed(url, hosts)) {
        return (
          <p className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {definition ? text(definition.label, locale) : block.type}: {strings.unavailable}
          </p>
        );
      }
      return shell(
        <div className="overflow-hidden" style={{ borderRadius: 'var(--profile-card-radius)', boxShadow: 'var(--profile-card-shadow)' }}>
          <iframe src={url} title={title} className="h-64 w-full border-0" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" />
        </div>
      );
    }

    case 'audio':
    case 'image':
    case 'gallery':
    case 'carousel':
    case 'video':
      return <MediaBlockView block={block} locale={locale} theme={theme} rendererKey={definition?.rendererKey ?? block.type} title={title} subtitle={subtitle} />;

    case 'newsletter':
    case 'contact-form':
      return <FormBlockView block={block} locale={locale} theme={theme} kind={block.type === 'newsletter' ? 'newsletter' : 'contact-form'} />;

    case 'faq':
      return shell(
        <details className="rounded-card p-4" style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold" style={{ color: theme.text }}>
            <span className="min-w-0 flex-1">{title}</span>
            <ChevronDown className="h-4 w-4 shrink-0" style={{ color: theme.mutedText }} aria-hidden="true" />
          </summary>
          <p className="border-t pt-3 text-sm leading-relaxed" style={{ color: theme.mutedText, borderColor: 'rgba(148,163,184,0.25)' }}>
            {text(block.content, locale, subtitle)}
          </p>
        </details>
      );

    case 'testimonial':
      return shell(
        <blockquote className="rounded-card p-5 text-start" style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}>
          <span className="mb-3 flex gap-1" aria-label={`${block.config.rating ?? 5} / 5`}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star key={index} className={`h-4 w-4 ${index < Number(block.config.rating ?? 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden="true" />
            ))}
          </span>
          <p className="text-sm leading-relaxed" style={{ color: theme.text }}>“{text(block.content, locale, subtitle)}”</p>
          <cite className="mt-3 block text-xs font-bold not-italic" style={{ color: theme.mutedText }}>
            {title}
          </cite>
        </blockquote>
      );

    case 'product':
      return shell(
        <article className="rounded-card p-4 text-start" style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-control" style={{ backgroundColor: `${accent}18`, color: accent }}>
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-extrabold" style={{ color: theme.text }}>{title}</h3>
              <p className="truncate text-xs" style={{ color: theme.mutedText }}>{subtitle}</p>
            </div>
            <strong className="text-sm" style={{ color: theme.text }}>
              {typeof block.config.price === 'number' || typeof block.config.price === 'string' ? block.config.price : ''}
              {block.config.currency ? ` ${block.config.currency}` : ''}
            </strong>
          </div>
          <a
            href={safeBlockUrl(block.url)}
            {...(block.url ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="mt-3 flex min-h-11 items-center justify-center rounded-pill text-sm font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {strings.viewProduct}
          </a>
        </article>
      );

    case 'event':
      return shell(
        <a
          href={safeBlockUrl(block.url)}
          {...(block.url ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="flex min-h-16 items-center gap-3 rounded-card px-4 py-3 text-start"
          style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}
        >
          <CalendarDays className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm" style={{ color: theme.text }}>{title}</strong>
            <span className="block truncate text-xs" style={{ color: theme.mutedText }}>
              {subtitle || String(block.config.startsAt ?? '')}
            </span>
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: theme.mutedText }} aria-hidden="true" />
        </a>
      );

    case 'map':
    case 'location':
      return shell(
        <a
          href={safeBlockUrl(block.url)}
          target={block.url ? '_blank' : undefined}
          rel={block.url ? 'noreferrer' : undefined}
          className="flex min-h-16 items-center gap-3 rounded-card px-4 py-3 text-start"
          style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}
        >
          <MapPin className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm" style={{ color: theme.text }}>{title}</strong>
            <span className="block truncate text-xs" style={{ color: theme.mutedText }}>{subtitle || String(block.config.address ?? '')}</span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0" style={{ color: theme.mutedText }} aria-hidden="true" />
        </a>
      );

    case 'phone':
    case 'email': {
      const href = block.type === 'phone'
        ? /^tel:/i.test(block.url ?? '') ? block.url : `tel:${block.url ?? ''}`
        : /^mailto:/i.test(block.url ?? '') ? block.url : `mailto:${block.url ?? ''}${block.config.subject ? `?subject=${encodeURIComponent(String(block.config.subject))}` : ''}`;
      return shell(
        <a
          href={safeBlockUrl(href)}
          className="flex min-h-16 items-center gap-3 rounded-card px-4 py-3 text-start"
          style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control" style={{ backgroundColor: `${accent}18`, color: accent }}>
            {block.type === 'phone' ? <Phone className="h-5 w-5" aria-hidden="true" /> : <Mail className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm" style={{ color: theme.text }}>{title}</strong>
            <span className="block truncate text-xs" style={{ color: theme.mutedText }}>
              {block.type === 'phone' && block.config.hideNumber ? (isRtl ? 'مخفي' : 'Hidden') : block.url}
            </span>
          </span>
        </a>
      );
    }

    case 'file-download':
      return shell(
        <a
          href={safeBlockUrl(block.url)}
          download
          className="flex min-h-16 items-center gap-3 rounded-card px-4 py-3 text-start"
          style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}
        >
          <FileText className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm" style={{ color: theme.text }}>{title}</strong>
            <span className="block truncate text-xs" style={{ color: theme.mutedText }}>
              {[subtitle, block.config.fileType, block.config.fileSize].filter(Boolean).join(' · ')}
            </span>
          </span>
          <Download className="h-4 w-4 shrink-0" style={{ color: theme.mutedText }} aria-hidden="true" />
        </a>
      );

    case 'booking':
      return shell(
        <a
          href={safeBlockUrl(block.url)}
          target={block.url ? '_blank' : undefined}
          rel={block.url ? 'noreferrer' : undefined}
          className="flex min-h-16 items-center gap-3 rounded-card px-4 py-3 text-start"
          style={{ backgroundColor: theme.card, boxShadow: 'var(--profile-card-shadow)', borderRadius: 'var(--profile-card-radius)' }}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Play className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm" style={{ color: theme.text }}>{title}</strong>
            <span className="block truncate text-xs" style={{ color: theme.mutedText }}>{subtitle}</span>
          </span>
          <span className="shrink-0 rounded-pill px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: accent }}>
            {strings.book}
          </span>
        </a>
      );

    case 'instagram-grid':
      return <MediaBlockView block={block} locale={locale} theme={theme} rendererKey="instagram-grid" title={title} subtitle={subtitle} />;

    case 'password-gate':
      return <PasswordGate block={block} locale={locale} theme={theme} onBlockClick={onBlockClick} />;

    default:
      return shell(
        <a
          href={safeBlockUrl(block.url)}
          target={/^https?:/i.test(block.url ?? '') ? '_blank' : undefined}
          rel={/^https?:/i.test(block.url ?? '') ? 'noreferrer' : undefined}
          className="flex min-h-16 items-center gap-3 px-4 py-3 text-start transition duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: theme.card,
            borderRadius: 'var(--profile-card-radius)',
            border: `var(--profile-card-border) solid ${theme.button.variant === 'outline' ? accent : 'rgba(148,163,184,0.28)'}`,
            boxShadow: 'var(--profile-card-shadow)'
          }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-extrabold" style={{ color: theme.text, fontSize: 'var(--profile-body)' }}>{title}</strong>
            {subtitle && (
              <span className="mt-0.5 block truncate text-xs" style={{ color: theme.mutedText }}>
                {subtitle}
              </span>
            )}
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: theme.mutedText }} aria-hidden="true" />
        </a>
      );
  }
};

export const BlockList: React.FC<{ blocks: ProfileBlock[]; locale: Locale; theme: ThemeConfig; labelledBy?: string; onBlockClick?: (block: ProfileBlock) => void }> = ({
  blocks,
  locale,
  theme,
  labelledBy,
  onBlockClick
}) => (
  <section className="space-y-3" aria-label={labelledBy}>
    {blocks.map((block) => (
      <ProfileBlockView key={block.id} block={block} locale={locale} theme={theme} onBlockClick={onBlockClick} />
    ))}
  </section>
);
