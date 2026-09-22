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
      className="py-10 sm:py-12 md:py-14 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 relative overflow-hidden transition-colors duration-200"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative mb-8 md:mb-10">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {t.eyebrow}
          </span>
          <h2 className="mt-2 text-[30px] sm:text-[36px] md:text-[40px] font-extrabold text-ink dark:text-white tracking-tight leading-tight">
            {t.headline}
          </h2>
          <p className="text-[16px] sm:text-[18px] text-slate-600 dark:text-slate-300 mt-2">
            {t.subheadline}
          </p>

          <div className="hidden lg:block absolute right-4 top-2 text-indigo-600 dark:text-indigo-400 rotate-2 pointer-events-none">
            <span className="font-serif italic font-bold text-[14px]">{t.doodleText}</span>
            <svg width="76" height="48" viewBox="0 0 76 48" fill="none" className="absolute right-0 top-5">
              <path d="M8 7C27 12 41 36 64 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M54 20L65 24L59 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-7 md:gap-8">
          {steps.map((step) => (
            <article key={step.number} className="raloa-step-depth relative z-10 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent">
              {step.number < steps.length && (
                <div
                  className="hidden md:block absolute top-5 left-24 right-[-3.25rem] h-px bg-slate-200 dark:bg-slate-800"
                  aria-hidden="true"
                />
              )}
              <div className="raloa-step-markers flex items-center gap-3 mb-3">
                <span className="relative z-10 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[15px] font-extrabold shadow-md ring-3 ring-white dark:ring-slate-950">
                  {step.number}
                </span>
                <span className="relative z-10 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
                  {React.cloneElement(step.icon, { className: 'w-3.5 h-3.5' })}
                </span>
              </div>
              <h3 className="font-extrabold text-[18px] text-ink dark:text-white tracking-tight mb-2">
                {step.title}
              </h3>
              <p className="text-[14px] sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
