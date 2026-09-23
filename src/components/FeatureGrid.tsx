import React from 'react';
import {
  Globe,
  Calendar,
  ShoppingBag,
  BarChart3,
  Image,
  Share2,
  Search,
  Sliders,
  ArrowRight
} from 'lucide-react';
import { Locale } from '../types';
import { featuresList, dictionary } from '../data/content';

interface FeatureGridProps {
  locale: Locale;
  onExploreFeatures: () => void;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({ locale, onExploreFeatures }) => {
  const isRtl = locale === 'ar';
  const t = dictionary[locale].featuresSection;

  const renderIcon = (name: string) => {
    switch (name) {
      case 'globe':
        return <Globe className="w-5 h-5 text-blue-600" />;
      case 'calendar':
        return <Calendar className="w-5 h-5 text-pink-600" />;
      case 'shopping-bag':
        return <ShoppingBag className="w-5 h-5 text-purple-600" />;
      case 'bar-chart-3':
        return <BarChart3 className="w-5 h-5 text-blue-600" />;
      case 'image':
        return <Image className="w-5 h-5 text-sky-600" />;
      case 'share-2':
        return <Share2 className="w-5 h-5 text-emerald-600" />;
      case 'search':
        return <Search className="w-5 h-5 text-teal-600" />;
      case 'sliders':
      default:
        return <Sliders className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <section id="features" className="py-16 sm:py-20 md:py-24 bg-surface-alt dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-7 lg:px-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-5 sm:gap-6">
          <div className="max-w-[650px]">
            <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-2">
              {t.eyebrow}
            </span>
            <h2 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-ink dark:text-white tracking-[-0.035em] leading-[1.05]">
              {t.headline}
            </h2>
            <p className="text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-300 mt-3 font-normal leading-relaxed max-w-[560px]">
              {t.subheadline}
            </p>
          </div>

          <button
            onClick={onExploreFeatures}
            className="inline-flex min-h-11 items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 text-[14px] font-bold shadow-2xs hover:shadow-sm transition-all whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            <span>{t.seeAll}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* 8-Card Grid (4x2 on desktop, 2x4 on tablet, 1x8 on mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {featuresList.map((item, index) => (
            <div
              key={item.id}
              className="raloa-feature-depth group relative overflow-hidden rounded-[1.35rem] bg-white dark:bg-slate-900 p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.035)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all duration-300"
              style={{ '--feature-index': index } as React.CSSProperties}
            >
              <span className="raloa-feature-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div
                className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-transform group-hover:scale-105 duration-200"
                style={{ backgroundColor: item.bgColor }}
              >
                {renderIcon(item.icon)}
              </div>

              <h3 className="font-extrabold text-[15px] sm:text-[17px] text-ink dark:text-white tracking-tight mb-1.5 leading-snug">
                {isRtl ? item.titleAr : item.title}
              </h3>

              <p className="text-[14px] sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {isRtl ? item.bodyAr : item.body}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
