import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { RaloaLogo } from './brand/RaloaLogo';
import { LanguageDropdown } from './LanguageDropdown';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';
import { VoiceTourToggle } from './VoiceTourToggle';
import { Locale } from '../types';
import { Theme } from '../utils/theme';
import { dictionary } from '../data/content';

interface HeaderProps {
  locale: Locale;
  onToggleLocale?: () => void;
  onSelectLocale: (locale: Locale) => void;
  onOpenStudio: (username?: string) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  theme: Theme;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  voiceTourEnabled?: boolean;
  voiceTourSpeaking?: boolean;
  onToggleVoiceTour?: () => void;
  currentSection?: string;
  onReplayVoiceTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  locale,
  onToggleLocale,
  onSelectLocale,
  onOpenStudio,
  onOpenAuth,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  voiceTourEnabled = false,
  voiceTourSpeaking = false,
  onToggleVoiceTour,
  currentSection = 'hero',
  onReplayVoiceTour
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRtl = locale === 'ar';
  const isDark = theme === 'dark';
  const t = dictionary[locale].nav;

  const handleSelectLanguage = (newLocale: Locale) => {
    if (onSelectLocale) {
      onSelectLocale(newLocale);
    } else if (onToggleLocale && newLocale !== locale) {
      onToggleLocale();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: t.templates, href: '#templates' },
    { label: t.features, href: '#features' },
    { label: t.howItWorks, href: '#how-it-works' },
    { label: t.pricing, href: '#pricing' },
    { label: t.resources, href: '#faq' }
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const topOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 h-[72px] transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-850 shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
            : 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs border-b border-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
            aria-label="RALOA Home"
          >
            <RaloaLogo isRtl={isRtl} theme={isDark ? 'on-dark' : 'primary'} />
          </a>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-9" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-[14px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white transition-colors relative py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Voice-over Tour Toggle */}
            {onToggleVoiceTour && (
              <VoiceTourToggle
                enabled={voiceTourEnabled}
                isSpeaking={voiceTourSpeaking}
                onToggle={onToggleVoiceTour}
                currentSection={currentSection}
                onReplay={onReplayVoiceTour}
                variant="header"
                locale={locale}
              />
            )}

            {/* Ambient Sound Toggle */}
            <SoundToggle
              enabled={soundEnabled}
              onToggle={onToggleSound}
              variant="header"
              locale={locale}
            />

            {/* Global Theme Toggle */}
            <ThemeToggle
              theme={theme}
              onToggleTheme={onToggleTheme}
              variant="header"
              locale={locale}
            />

            {/* Language Switcher Dropdown */}
            <LanguageDropdown
              currentLocale={locale}
              onSelectLocale={handleSelectLanguage}
              variant="header"
            />

            {/* Sign in Button */}
            <button
              onClick={() => onOpenAuth('signin')}
              className="hidden sm:inline-flex text-[14px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t.signIn}
            </button>

            {/* Primary CTA Button */}
            <button
              onClick={() => onOpenStudio()}
              className="hidden lg:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[14px] font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
            >
              <span>{t.createPage}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className={`fixed top-0 bottom-0 ${
              isRtl ? 'left-0' : 'right-0'
            } w-[310px] bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col justify-between transition-transform duration-300 ease-out border-s border-slate-200 dark:border-slate-800`}
            onClick={(e) => e.stopPropagation()}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                <RaloaLogo isRtl={isRtl} size="sm" theme={isDark ? 'on-dark' : 'primary'} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col space-y-4" aria-label="Mobile Navigation">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-[16px] font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                  </a>
                ))}
              </nav>

              {/* Theme, Sound & Language Controls in Mobile Drawer */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {onToggleVoiceTour && (
                  <VoiceTourToggle
                    enabled={voiceTourEnabled}
                    isSpeaking={voiceTourSpeaking}
                    onToggle={onToggleVoiceTour}
                    currentSection={currentSection}
                    onReplay={onReplayVoiceTour}
                    variant="mobile"
                    locale={locale}
                  />
                )}

                <SoundToggle
                  enabled={soundEnabled}
                  onToggle={onToggleSound}
                  variant="mobile"
                  locale={locale}
                />

                <ThemeToggle
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  variant="mobile"
                  locale={locale}
                />

                <LanguageDropdown
                  currentLocale={locale}
                  onSelectLocale={(newLocale) => {
                    handleSelectLanguage(newLocale);
                  }}
                  variant="mobile"
                />
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signin');
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[14px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t.signIn}
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenStudio();
                }}
                className="w-full py-3 rounded-xl bg-[#0F172A] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[14px] font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.createPage}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

