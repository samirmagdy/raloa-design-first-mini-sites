import React from 'react';
import { LayoutGrid, PenTool, Send } from 'lucide-react';
import { Locale } from '../types';
import { dictionary } from '../data/content';

interface HowItWorksProps {
  locale: Locale;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ locale }) => {
  const isRtl = locale === 'ar';
  const t = dictionary[locale].howItWorksSection;
  const steps = [
    { number: 1, icon: <LayoutGrid className="w-4 h-4" />, title: t.steps[0].title, body: t.steps[0].body },
    { number: 2, icon: <PenTool className="w-4 h-4" />, title: t.steps[1].title, body: t.steps[1].body },
    { number: 3, icon: <Send className="w-4 h-4" />, title: t.steps[2].title, body: t.steps[2].body }
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-20 md:py-24 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 relative overflow-hidden transition-colors duration-200"
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-7 lg:px-10">
        <div className="relative mb-12 md:mb-14 flex items-end justify-between gap-8">
          <div className="max-w-[650px]">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {t.eyebrow}
          </span>
          <h2 className="mt-2 text-[32px] sm:text-[38px] md:text-[44px] font-extrabold text-ink dark:text-white tracking-[-0.035em] leading-[1.05]">
            {t.headline}
          </h2>
          <p className="text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-300 mt-3 leading-relaxed max-w-[520px]">
            {t.subheadline}
          </p>
          </div>

          <div className="hidden lg:block absolute right-4 top-2 text-indigo-600 dark:text-indigo-400 rotate-2 pointer-events-none">
            <span className="font-serif italic font-bold text-[14px]">{t.doodleText}</span>
            <svg width="76" height="48" viewBox="0 0 76 48" fill="none" className="absolute right-0 top-5">
              <path d="M8 7C27 12 41 36 64 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M54 20L65 24L59 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
          <div className="raloa-process-line hidden md:block" aria-hidden="true" />
          {steps.map((step) => (
            <article key={step.number} className="raloa-step-depth raloa-step-panel relative z-10 rounded-[1.5rem] px-4 py-5 md:px-5 md:py-6 bg-white dark:bg-slate-950">
              <div className="raloa-step-markers flex items-center gap-3 mb-5">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-[16px] font-extrabold ring-8 ring-white dark:ring-slate-950">
                  {step.number}
                </span>
                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                  {React.cloneElement(step.icon, { className: 'w-3.5 h-3.5' })}
                </span>
              </div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600/70 dark:text-indigo-400/70">
                {String(step.number).padStart(2, '0')}
              </div>
              <h3 className="font-extrabold text-[18px] text-ink dark:text-white tracking-tight mb-2">
                {step.title}
              </h3>
              <p className="text-[15px] sm:text-[16px] text-slate-700 dark:text-slate-300 leading-relaxed max-w-sm">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
