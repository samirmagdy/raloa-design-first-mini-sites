import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Locale } from '../types';
import { faqData, dictionary } from '../data/content';
import { calculateReadingTime } from '../utils/readingTime';
import { ReadTimeBadge } from './ReadTimeBadge';

interface FAQAccordionProps {
  locale: Locale;
  onContactSupport: () => void;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ locale, onContactSupport }) => {
  // First item open by default per spec: "Accordion; first item optionally open"
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'faq-1': true
  });

  const isRtl = locale === 'ar';
  const t = dictionary[locale].faqSection;

  // Calculate estimated reading time for all FAQ questions and answers
  const faqContent = [
    t.eyebrow,
    t.headline,
    t.stillQuestions,
    t.contactSupport,
    ...faqData.map((item) => `${isRtl ? item.questionAr : item.question} ${isRtl ? item.answerAr : item.answer}`)
  ];
  const readTime = calculateReadingTime(faqContent, locale);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section id="faq" className="py-12 sm:py-18 md:py-28 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          
          {/* Left Column: Heading & Contact info */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <span className="text-[12px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t.eyebrow}
              </span>
              <span className="text-slate-500 dark:text-slate-400 select-none">•</span>
              <ReadTimeBadge
                formatted={readTime.formatted}
                wordCount={readTime.wordCount}
                locale={locale}
              />
            </div>
            <h2 className="text-[32px] sm:text-[42px] font-extrabold text-ink dark:text-white tracking-tight leading-[1.08] mb-4">
              {t.headline}
            </h2>
            <p className="text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-300 font-normal">
              <span>{t.stillQuestions} </span>
              <button
                onClick={onContactSupport}
                className="inline-flex min-h-11 items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold underline underline-offset-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                {t.contactSupport}
              </button>
            </p>
          </div>

          {/* Right Column: 5 Accordion items */}
          <div className="lg:col-span-7 space-y-3.5">
            {faqData.map((item) => {
              const isOpen = !!openItems[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all duration-200 bg-white dark:bg-slate-900"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${item.id}`}
                    className="w-full min-h-12 py-3.5 px-5 sm:px-6 flex items-center justify-between text-left rtl:text-right hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors cursor-pointer select-none"
                  >
                    <span className="font-bold text-[16px] text-ink dark:text-white tracking-tight pr-4 rtl:pr-0 rtl:pl-4">
                      {isRtl ? item.questionAr : item.question}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${item.id}`}
                      className="px-5 sm:px-6 pb-5 pt-1 text-[15px] sm:text-[16px] text-slate-700 dark:text-slate-200 leading-relaxed font-normal animate-in fade-in duration-200"
                    >
                      <p>{isRtl ? item.answerAr : item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};
