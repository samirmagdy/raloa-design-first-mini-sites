import React, { useState, useRef } from 'react';
import { Check, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { motion, useTransform } from 'motion/react';
import { Locale, TemplateItem } from '../types';
import { dictionary } from '../data/content';
import { PhoneMockup } from './PhoneMockup';
import { useScrollProgress } from '../hooks/useScrollProgress';
import {
  AnnotationCard,
  CurvedArrowDownRight,
  CurvedArrowUpRight,
  CurvedArrowDownLeft,
  FloatingMetricBadge
} from './brand/Doodles';

interface HeroProps {
  locale: Locale;
  heroTemplate: TemplateItem;
  onOpenStudio: (username: string) => void;
  onOpenPhoneAction: (type: 'portfolio' | 'booking' | 'shop' | 'gear', data?: any) => void;
}

export const Hero: React.FC<HeroProps> = ({
  locale,
  heroTemplate,
  onOpenStudio,
  onOpenPhoneAction
}) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isRtl = locale === 'ar';
  const t = dictionary[locale].hero;

  const heroRef = useRef<HTMLElement>(null);

  // Track scroll progress through the hero section with smooth physics
  const { smoothProgress } = useScrollProgress({
    targetRef: heroRef,
    offset: ['start start', 'end start']
  });

  // Parallax and tilt transformations linked to scroll progress
  const phoneY = useTransform(smoothProgress, [0, 1], [0, 85]);
  const phoneRotate = useTransform(smoothProgress, [0, 1], [0, isRtl ? 3.5 : -3.5]);
  const phoneScale = useTransform(smoothProgress, [0, 0.7, 1], [1, 0.98, 0.94]);

  const sticker1Y = useTransform(smoothProgress, [0, 1], [0, -45]);
  const sticker2Y = useTransform(smoothProgress, [0, 1], [0, 55]);
  const sticker3Y = useTransform(smoothProgress, [0, 1], [0, -50]);
  const badgeY = useTransform(smoothProgress, [0, 1], [0, 35]);
  const glowY = useTransform(smoothProgress, [0, 1], [0, 60]);
  const glowScale = useTransform(smoothProgress, [0, 1], [1, 1.15]);

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setError(isRtl ? 'يرجى إدخال اسم المستخدم' : 'Please enter a username');
      return;
    }

    // Spec: Allowed characters check
    const validPattern = /^[a-zA-Z0-9_-]{2,30}$/;
    if (!validPattern.test(cleanUsername)) {
      setError(
        isRtl
          ? 'يجب أن يتكون الاسم من ٢-٣٠ حرفاً إنجليزياً أو أرقام أو شرطات'
          : 'Username must be 2–30 alphanumeric characters, dashes or underscores'
      );
      return;
    }

    setError(null);
    onOpenStudio(cleanUsername);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(val);
    if (error) setError(null);
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative pt-[88px] md:pt-[96px] pb-10 md:pb-12 overflow-hidden bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFC] to-[#F5F3FF] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-200"
    >
      {/* Decorative ambient subtle glow with scroll parallax */}
      <motion.div
        style={{ y: glowY, scale: glowScale }}
        className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-200/30 to-purple-200/20 dark:from-indigo-600/10 dark:to-purple-600/10 blur-3xl rounded-full pointer-events-none -z-10"
      />
      <div className="absolute -right-[220px] top-[-180px] h-[760px] w-[760px] rounded-full bg-gradient-to-br from-blue-100/80 via-indigo-100/40 to-purple-200/70 blur-2xl dark:from-indigo-950/40 dark:via-slate-900/20 dark:to-purple-950/40 pointer-events-none" />
      <div className="absolute -right-[80px] top-[160px] h-[620px] w-[620px] rounded-full border border-indigo-200/50 dark:border-indigo-800/30 pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-4 items-center min-h-[520px] lg:min-h-[540px]">
          
          {/* Left Column: 55% split (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left rtl:lg:text-right">
            
            {/* Eyebrow Pill with smooth slide-down entrance */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-100/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] sm:text-[12px] tracking-wider uppercase mb-6 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{t.eyebrow}</span>
            </motion.div>

            {/* Headline with staged fade and glide */}
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-[40px] sm:text-[54px] md:text-[62px] lg:text-[70px] font-extrabold text-[#0F172A] dark:text-white tracking-[-0.03em] leading-[1.04] mb-6"
            >
              <span>{t.headlineStart}</span>
              <br />
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#5B5CF6] to-[#2563EB] dark:from-[#9061F9] dark:via-[#6366F1] dark:to-[#3B82F6] bg-clip-text text-transparent">
                {t.headlineGradient}
              </span>
            </motion.h1>

            {/* Subheadline with subtle delay */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="text-[17px] sm:text-[19px] lg:text-[20px] text-slate-600 dark:text-slate-300 leading-[1.55] max-w-[560px] mb-8 font-normal"
            >
              {t.subheadline}
            </motion.p>

            {/* Handle / CTA Input Bar */}
            <motion.form
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={validateAndSubmit}
              className="w-full max-w-[530px] mb-4"
              noValidate
            >
              <div
                className={`relative flex flex-col sm:flex-row items-stretch sm:items-center bg-white dark:bg-slate-900 rounded-2xl sm:rounded-full p-2 border shadow-[0_12px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all ${
                  error
                    ? 'border-rose-400 ring-2 ring-rose-200 dark:ring-rose-950'
                    : 'border-slate-200 dark:border-slate-800 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-3 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-950/60'
                }`}
              >
                {/* Prefix & Input */}
                <div className="flex items-center flex-1 px-3 py-2 sm:py-0">
                  <span className="text-[15px] font-semibold text-slate-400 dark:text-slate-500 select-none ltr:mr-1 rtl:ml-1">
                    {t.prefix}
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={handleInputChange}
                    placeholder={t.placeholder}
                    className="w-full bg-transparent text-[16px] font-semibold text-[#0F172A] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                    aria-label="Choose your username handle"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>

                {/* Primary CTA Submit */}
                <button
                  type="submit"
                  className="mt-2 sm:mt-0 min-h-[48px] px-6 py-3 rounded-xl sm:rounded-full bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 active:scale-[0.98] text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>{t.cta}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>

              {/* Validation message if error */}
              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-rose-600 dark:text-rose-400 text-xs font-semibold px-2 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </motion.form>

            {/* Proof Points with staggered entrance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-[13px] font-medium text-slate-600 dark:text-slate-400 mt-2"
            >
              {t.proof.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + idx * 0.07 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span>{item}</span>
                </motion.div>
              ))}
            </motion.div>

          </div>

          {/* Right Column: 45% split (lg:col-span-5) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            
            {/* Phone Mockup with scroll-linked parallax, rotation, and gentle float */}
            <motion.div
              style={{
                y: phoneY,
                rotate: phoneRotate,
                scale: phoneScale
              }}
              className="relative z-10 w-full max-w-[380px] flex justify-center"
            >
              {/* Dynamic entrance glide + infinite subtle breathing oscillation */}
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -10, 0]
                }}
                transition={{
                  opacity: { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
                  y: {
                    duration: 4.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.0
                  }
                }}
                className="w-full flex justify-center"
              >
                <PhoneMockup
                  template={heroTemplate}
                  isRtl={isRtl}
                  className="!max-w-[380px]"
                  onOpenAction={onOpenPhoneAction}
                />
              </motion.div>
            </motion.div>

            {/* Floating Annotation Sticker 1 (Top Left) */}
            <motion.div
              style={{ y: sticker1Y }}
              initial={{ opacity: 0, scale: 0, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.55 }}
              className="hidden sm:block absolute -top-4 -left-6 md:-left-10 z-20 pointer-events-none"
            >
              <div className="flex flex-col items-end">
                <AnnotationCard rotation="-rotate-3">
                  <span>{t.allLinksSticker}</span>
                </AnnotationCard>
                <CurvedArrowDownRight className="mt-1 mr-4" />
              </div>
            </motion.div>

            {/* Floating Annotation Sticker 2 (Bottom Left) */}
            <motion.div
              style={{ y: sticker2Y }}
              initial={{ opacity: 0, scale: 0, rotate: 15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.7 }}
              className="hidden sm:block absolute bottom-12 -left-6 md:-left-8 z-20 pointer-events-none"
            >
              <div className="flex flex-col items-end">
                <CurvedArrowUpRight className="mb-1 mr-2" />
                <AnnotationCard rotation="rotate-2">
                  <span>{t.templatesSticker}</span>
                </AnnotationCard>
              </div>
            </motion.div>

            {/* Floating Annotation Sticker 3 (Top Right) */}
            <motion.div
              style={{ y: sticker3Y }}
              initial={{ opacity: 0, scale: 0, rotate: 20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.62 }}
              className="hidden sm:block absolute top-6 -right-6 md:-right-8 z-20 pointer-events-none"
            >
              <div className="flex flex-col items-start">
                <AnnotationCard rotation="rotate-3">
                  <span>{t.anyDeviceSticker}</span>
                </AnnotationCard>
                <CurvedArrowDownLeft className="mt-1 ml-4" />
              </div>
            </motion.div>

            {/* Floating Metric Badge (+300% More clicks) (Middle Right) */}
            <motion.div
              style={{ y: badgeY }}
              initial={{ opacity: 0, scale: 0.4, x: 25 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.8 }}
              className="hidden sm:block absolute top-1/2 -right-8 md:-right-12 -translate-y-1/2 z-20"
            >
              <FloatingMetricBadge
                metric={locale === 'ar' ? '+٣٠٠٪' : '+300%'}
                label={locale === 'ar' ? 'نقرات إضافية' : 'More clicks'}
              />
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
};
