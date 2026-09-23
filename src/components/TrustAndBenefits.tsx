import React, { useEffect, useRef } from 'react';
import { Zap, Palette, TrendingUp, Monitor } from 'lucide-react';
import { Locale } from '../types';
import { benefitsList } from '../data/content';

interface TrustAndBenefitsProps {
  locale: Locale;
}

const trustedBrands = [
  { name: 'YouTube', asset: 'youtube' },
  { name: 'Instagram', asset: 'instagram' },
  { name: 'TikTok', asset: 'tiktok' },
  { name: 'LinkedIn', asset: 'linkedin' },
  { name: 'Adobe', asset: 'adobe' },
  { name: 'Spotify', asset: 'spotify' },
  { name: 'Notion', asset: 'notion' }
];

export const TrustAndBenefits: React.FC<TrustAndBenefitsProps> = ({ locale }) => {
  const isRtl = locale === 'ar';
  const brandRailRef = useRef<HTMLDivElement>(null);
  const autoScrollPausedRef = useRef(false);

  useEffect(() => {
    const rail = brandRailRef.current;
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    if (!rail || !mobileQuery.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const pauseAutoScroll = () => {
      autoScrollPausedRef.current = true;
    };

    let frame = 0;
    let previousTime = performance.now();
    const scrollBrands = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;

      if (!autoScrollPausedRef.current && !document.hidden) {
        const firstSet = rail.querySelector<HTMLElement>('[data-brand-set="primary"]');
        const cycleWidth = firstSet?.offsetWidth ?? 0;
        if (cycleWidth > 0) {
          rail.scrollLeft += (isRtl ? -1 : 1) * elapsed * 0.035;
          if (rail.scrollLeft >= cycleWidth) rail.scrollLeft -= cycleWidth;
        }
      }

      frame = window.requestAnimationFrame(scrollBrands);
    };
    frame = window.requestAnimationFrame(scrollBrands);
    rail.addEventListener('pointerdown', pauseAutoScroll, { passive: true });
    rail.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    rail.addEventListener('focusin', pauseAutoScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      rail.removeEventListener('pointerdown', pauseAutoScroll);
      rail.removeEventListener('touchstart', pauseAutoScroll);
      rail.removeEventListener('focusin', pauseAutoScroll);
    };
  }, [isRtl]);

  const getIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-5 h-5 text-[#EC4899]" />;
      case 'palette':
        return <Palette className="w-5 h-5 text-[#3B82F6]" />;
      case 'trending-up':
        return <TrendingUp className="w-5 h-5 text-[#10B981]" />;
      case 'devices':
      default:
        return <Monitor className="w-5 h-5 text-[#7C3AED]" />;
    }
  };

  return (
    <section id="benefits" className="pt-6 pb-16 sm:pb-20 md:pb-24 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 overflow-hidden transition-colors duration-200">
      {/* Approved trust row: quiet static brand proof, not a competing content carousel. */}
      <div className="max-w-[1280px] mx-auto px-5 sm:px-7 lg:px-10 pt-3 pb-10">
        <p className="text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-5">
          {isRtl ? 'يعمل مع المنصات التي تستخدمها بالفعل' : 'Works with the platforms you already use'}
        </p>
        <div
          ref={brandRailRef}
          className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:overflow-visible sm:px-0"
          role="region"
          aria-label={isRtl ? 'المنصات المدعومة' : 'Supported platforms'}
          onMouseEnter={() => {
            autoScrollPausedRef.current = true;
          }}
          onFocus={() => {
            autoScrollPausedRef.current = true;
          }}
        >
          <div className="flex w-max items-center text-slate-600 dark:text-slate-400 sm:grid sm:w-auto sm:grid-cols-4 sm:gap-5 lg:grid-cols-7">
            <div data-brand-set="primary" className="flex items-center gap-7 pr-7 sm:contents">
              {trustedBrands.map(({ name, asset }) => (
                <div
                  key={name}
                  className="flex min-w-[118px] items-center justify-start gap-2 text-[13px] font-bold sm:min-w-0 sm:justify-center sm:text-[14px]"
                >
                  <img
                    src={`/brand/trusted/${asset}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 object-contain opacity-75 dark:invert"
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>
            <div aria-hidden="true" className="flex items-center gap-7 pr-7 sm:hidden">
              {trustedBrands.map(({ name, asset }) => (
                <div key={`duplicate-${name}`} className="flex min-w-[118px] items-center justify-start gap-2 text-[13px] font-bold">
                  <img
                    src={`/brand/trusted/${asset}.svg`}
                    alt=""
                    className="h-4 w-4 shrink-0 object-contain opacity-75 dark:invert"
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 02 Core Platform Value Pillars */}
      <div className="max-w-[1280px] mx-auto px-5 sm:px-7 lg:px-10 mt-6 sm:mt-8">
        <h2 className="sr-only">
          {isRtl ? 'لماذا يختار صناع المحتوى رالوا' : 'Why creators choose RALOA'}
        </h2>
        {/* 4 Benefit Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {benefitsList.map((benefit) => (
            <div
              key={benefit.id}
              className="raloa-feature-depth bg-white dark:bg-slate-900 rounded-[1.35rem] p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.035)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all duration-300 flex flex-col justify-start group"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 sm:mb-5 transition-transform group-hover:scale-110 duration-200"
                style={{ backgroundColor: benefit.bgColor }}
              >
                {getIcon(benefit.icon, benefit.color)}
              </div>

              <h3 className="font-extrabold text-[15px] sm:text-[17px] text-ink dark:text-white tracking-tight leading-snug mb-2">
                {isRtl ? benefit.titleAr : benefit.title}
              </h3>

              <p className="text-[14px] sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {isRtl ? benefit.bodyAr : benefit.body}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
