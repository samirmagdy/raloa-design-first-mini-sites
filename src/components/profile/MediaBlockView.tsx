import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Volume2 } from 'lucide-react';
import type { Locale } from '../../types';
import type { ProfileBlock } from '../../services/contracts/block';
import type { ThemeConfig } from '../../services/contracts/theme';
import { listConfig, numberConfig, safeBlockUrl, stringConfig } from './blockHelpers';
import { text } from '../../i18n/ui';

interface MediaBlockViewProps {
  block: ProfileBlock;
  locale: Locale;
  theme: ThemeConfig;
  rendererKey: string;
  title: string;
  subtitle: string;
}

const BrokenImage: React.FC<{ theme: ThemeConfig; label: string }> = ({ theme, label }) => (
  <div
    className="flex min-h-32 w-full items-center justify-center gap-2 text-xs font-bold"
    style={{ backgroundColor: `${theme.mutedText}14`, color: theme.mutedText }}
  >
    <ImageOff className="h-4 w-4" aria-hidden="true" />
    {label}
  </div>
);

export const MediaBlockView: React.FC<MediaBlockViewProps> = ({ block, locale, theme, rendererKey, title, subtitle }) => {
  const isRtl = locale === 'ar';
  const [slide, setSlide] = useState(0);
  const [failed, setFailed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const images = listConfig(block, 'images');
  const accent = theme.accent;

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.card,
    borderRadius: 'var(--profile-card-radius)',
    border: 'var(--profile-card-border) solid rgba(148,163,184,0.28)',
    boxShadow: 'var(--profile-card-shadow)'
  };

  if (rendererKey === 'audio') {
    const src = stringConfig(block, 'audioUrl', block.url ?? '');
    return (
      <figure className="p-4" style={cardStyle}>
        <figcaption className="mb-3 flex items-center gap-2 text-sm font-extrabold" style={{ color: theme.text }}>
          <Volume2 className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 truncate">{title}</span>
        </figcaption>
        {src ? (
          <audio className="w-full" controls preload="none" src={safeBlockUrl(src)}>
            {isRtl ? 'متصفحك لا يدعم مشغل الصوت.' : 'Your browser cannot play this audio.'}
          </audio>
        ) : (
          <p className="text-xs" style={{ color: theme.mutedText }}>{isRtl ? 'لا يوجد ملف صوتي.' : 'No audio file set.'}</p>
        )}
        {subtitle && <p className="mt-2 text-xs" style={{ color: theme.mutedText }}>{subtitle}</p>}
      </figure>
    );
  }

  if (rendererKey === 'video') {
    const src = stringConfig(block, 'videoUrl', block.url ?? '');
    const autoplay = rendererKey === 'video' && block.type === 'direct-video' && block.config.autoplay === true;
    return (
      <div className="overflow-hidden bg-black" style={{ borderRadius: 'var(--profile-card-radius)' }}>
        {src ? (
          <video className="max-h-[32rem] w-full" controls poster={stringConfig(block, 'poster') || undefined} src={safeBlockUrl(src)} autoPlay={autoplay} muted={autoplay} playsInline />
        ) : (
          <BrokenImage theme={theme} label={isRtl ? 'لا يوجد ملف فيديو.' : 'No video file set.'} />
        )}
      </div>
    );
  }

  if (rendererKey === 'image' || rendererKey === 'instagram-grid') {
    const src = rendererKey === 'image' ? stringConfig(block, 'imageUrl', block.url ?? '') : (images[0] ?? '');
    const alt = stringConfig(block, 'alt', title);
    const content = failed ? (
      <BrokenImage theme={theme} label={isRtl ? 'تعذر تحميل الصورة.' : 'Image could not load.'} />
    ) : (
      <img
        src={safeBlockUrl(src)}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-auto max-h-[32rem] w-full"
        style={{ objectFit: block.config.fit === 'contain' ? 'contain' : 'cover' }}
      />
    );

    if (rendererKey === 'instagram-grid') {
      const count = Math.min(Math.max(numberConfig(block, 'mediaCount', 6), 1), 12);
      const grid = images.length ? images : Array.from({ length: count }, (_, index) => src).filter(Boolean);
      return (
        <div className="p-2" style={cardStyle}>
          <div className="mb-2 flex items-center justify-between px-2 pt-1">
            <strong className="text-xs font-extrabold uppercase tracking-wider" style={{ color: theme.mutedText }}>{title}</strong>
            <span className="rounded-pill px-2 py-0.5 text-2xs font-bold" style={{ backgroundColor: `${accent}1F`, color: accent }}>
              {isRtl ? 'بيانات تجريبية' : 'demo grid'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {grid.slice(0, count).map((image, index) => (
              <a
                key={`${image}-${index}`}
                href={block.config.captionLinks === false ? undefined : safeBlockUrl(image)}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square overflow-hidden rounded-control"
                style={{ backgroundColor: `${theme.mutedText}14` }}
              >
                <img src={image} alt={`${title} ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      );
    }

    return (
      <figure style={cardStyle} className="overflow-hidden">
        {content}
        {subtitle && (
          <figcaption className="px-4 py-3 text-xs" style={{ color: theme.mutedText }}>
            {subtitle}
          </figcaption>
        )}
      </figure>
    );
  }

  // gallery + carousel
  if (!images.length) {
    return <BrokenImage theme={theme} label={isRtl ? 'لم تُضف صور بعد.' : 'No images added yet.'} />;
  }

  if (rendererKey === 'carousel') {
    const step = (direction: 1 | -1) => setSlide((current) => (current + direction + images.length) % images.length);
    return (
      <div className="relative overflow-hidden" style={cardStyle}>
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          role="group"
          aria-roledescription="carousel"
          aria-label={title}
          onScroll={(event) => {
            const target = event.currentTarget;
            const index = Math.round(target.scrollLeft / Math.max(1, target.clientWidth));
            if (index !== slide) setSlide(index);
          }}
        >
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="w-full shrink-0 snap-center">
              <img src={image} alt={`${title} ${index + 1} / ${images.length}`} loading="lazy" className="h-64 w-full object-cover sm:h-80" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={isRtl ? 'الصورة السابقة' : 'Previous image'}
              className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-white/85 text-slate-800 shadow-md backdrop-blur"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={isRtl ? 'الصورة التالية' : 'Next image'}
              className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-pill bg-white/85 text-slate-800 shadow-md backdrop-blur"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </button>
            <p className="absolute bottom-2 end-2 rounded-pill bg-slate-900/70 px-2 py-0.5 text-2xs font-bold text-white tabular-nums">
              {slide + 1}/{images.length}
            </p>
          </>
        )}
      </div>
    );
  }

  const columns = Math.min(Math.max(numberConfig(block, 'columns', 2), 1), 4);
  return (
    <figure className="p-2" style={cardStyle}>
      {title && (
        <figcaption className="px-2 py-1 text-xs font-extrabold uppercase tracking-wider" style={{ color: theme.mutedText }}>
          {title}
        </figcaption>
      )}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {images.map((image, index) => (
          <img
            key={`${image}-${index}`}
            src={image}
            alt={`${title || text(block.title, locale, 'Gallery')} ${index + 1}`}
            loading="lazy"
            className="aspect-square w-full rounded-control object-cover"
            style={{ backgroundColor: `${theme.mutedText}14` }}
          />
        ))}
      </div>
    </figure>
  );
};
