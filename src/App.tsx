import React, { lazy, Suspense, useState, useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { Locale, TemplateItem, PricingPlan } from './types';
import { templatesData, pricingPlans } from './data/content';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { TrustAndBenefits } from './components/TrustAndBenefits';
import { TemplateGallery } from './components/TemplateGallery';
import { HowItWorks } from './components/HowItWorks';
import { FeatureGrid } from './components/FeatureGrid';
import { Testimonials } from './components/Testimonials';
import { PricingTable } from './components/PricingTable';
import { FAQAccordion } from './components/FAQAccordion';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';
import { ScrollProgressBar } from './components/ScrollProgressBar';
import { BackToTop } from './components/BackToTop';
import { NotFound } from './components/NotFound';

// Interactive Modals
const StudioModal = lazy(() => import('./components/modals/StudioModal').then((module) => ({ default: module.StudioModal })));
const TemplatePreviewModal = lazy(() => import('./components/modals/TemplatePreviewModal').then((module) => ({ default: module.TemplatePreviewModal })));
const PlanCheckoutModal = lazy(() => import('./components/modals/PlanCheckoutModal').then((module) => ({ default: module.PlanCheckoutModal })));
const MiniSiteDemoModal = lazy(() => import('./components/modals/MiniSiteDemoModal').then((module) => ({ default: module.MiniSiteDemoModal })));
const AuthModal = lazy(() => import('./components/modals/AuthModal').then((module) => ({ default: module.AuthModal })));
const ContactModal = lazy(() => import('./components/modals/ContactModal').then((module) => ({ default: module.ContactModal })));
const LegalModal = lazy(() => import('./components/modals/LegalModal').then((module) => ({ default: module.LegalModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/modals/KeyboardShortcutsModal').then((module) => ({ default: module.KeyboardShortcutsModal })));
const ProjectStatsModal = lazy(() => import('./components/modals/ProjectStatsModal').then((module) => ({ default: module.ProjectStatsModal })));
const ReferralModal = lazy(() => import('./components/modals/ReferralModal').then((module) => ({ default: module.ReferralModal })));
const EasterEggOverlay = lazy(() => import('./components/EasterEggOverlay').then((module) => ({ default: module.EasterEggOverlay })));
import { CustomCursor } from './components/CustomCursor';
import { getInitialLocale, persistLocale } from './utils/locale';
import { Theme, getInitialTheme, applyTheme } from './utils/theme';
import { getInitialSoundEnabled, persistSoundEnabled, ambientSound } from './utils/audio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useGlobalKeyboardListener } from './hooks/useGlobalKeyboardListener';
import { useSEO } from './hooks/useSEO';
import { useVoiceTour } from './hooks/useVoiceTour';
import { VoiceTourToggle } from './components/VoiceTourToggle';
import { navigate } from './app/router';
import { useRoute } from './app/navigation';
import { PublicProfilePage } from './components/PublicProfilePage';
import { StudioShell } from './components/studio/StudioShell';
import { AnalyticsPage } from './components/AnalyticsPage';
import { SettingsPage } from './components/SettingsPage';
import { OnboardingPage } from './components/OnboardingPage';
import { ImportPage } from './components/ImportPage';
import { AuthPage } from './components/AuthPage';

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => getInitialSoundEnabled());

  // One route store; navigation is History-API only, so drafts survive moving between screens.
  const route = useRoute();
  const isLanding = route.name === 'home' && (typeof window === 'undefined' || window.location.hash !== '#404');
  const attemptedPath = typeof window === 'undefined' ? '' : window.location.hash === '#404' ? '#404' : route.path;


  // Dynamic Section-Aware SEO Hook (updates document.title, canonical URL, OG, Twitter tags)
  useSEO({
    locale,
    customTitle:
      route.name === 'studio'
        ? locale === 'ar'
          ? 'الاستوديو — RALOA'
          : 'Studio — RALOA'
        : route.name === 'analytics'
        ? locale === 'ar'
          ? 'التحليلات — RALOA'
          : 'Analytics — RALOA'
        : route.name === 'settings'
        ? locale === 'ar'
          ? 'الإعدادات — RALOA'
          : 'Settings — RALOA'
        : route.name === 'onboarding'
        ? locale === 'ar'
          ? 'إنشاء صفحتك — RALOA'
          : 'Create your page — RALOA'
        : route.name === 'import'
        ? locale === 'ar'
          ? 'استيراد الملف — RALOA'
          : 'Import profile — RALOA'
        : route.name === 'signin'
        ? locale === 'ar'
          ? 'تسجيل الدخول — RALOA'
          : 'Sign in — RALOA'
        : route.name === 'not-found'
        ? locale === 'ar'
          ? '٤٠٤: الصفحة غير موجودة — RALOA'
          : '404: Page Not Found — RALOA'
        : undefined,
    customDescription:
      route.name === 'studio'
        ? locale === 'ar'
          ? 'أدر صفحاتك العامة من استوديو RALOA.'
          : 'Manage your RALOA public pages from Studio.'
        : route.name === 'analytics'
        ? locale === 'ar'
          ? 'تابع أداء صفحاتك العامة على RALOA.'
          : 'Track the performance of your public RALOA pages.'
        : route.name === 'settings'
        ? locale === 'ar'
          ? 'حدّث إعدادات صفحاتك العامة على RALOA.'
          : 'Update your public RALOA page settings.'
        : route.name === 'onboarding'
        ? locale === 'ar'
          ? 'أنشئ صفحة عامة جديدة على RALOA.'
          : 'Create a new public RALOA page.'
        : route.name === 'signin'
        ? locale === 'ar'
          ? 'افتح جلسة استوديو محلية على هذا الجهاز.'
          : 'Open a local Studio session on this device.'
        : route.name === 'import'
        ? locale === 'ar'
          ? 'استورد ملف RALOA محفوظاً إلى الاستوديو.'
          : 'Import a saved RALOA profile into Studio.'
        : !isLanding
        ? locale === 'ar'
          ? 'عذراً، الصفحة المطلوبة غير متوفرة. عد إلى الصفحة الرئيسية لرالوا.'
          : 'The link you followed may be broken. Return to RALOA home.'
        : undefined
  });

  // Web Speech API Voice-over Tour Hook
  const {
    isEnabled: voiceTourEnabled,
    isSpeaking: voiceTourSpeaking,
    currentSection: tourSection,
    toggleTour,
    replayCurrent
  } = useVoiceTour({ locale });

  // Modal States
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioUsername, setStudioUsername] = useState('creator');
  const [studioTemplate, setStudioTemplate] = useState<TemplateItem>(templatesData[0]);

  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const templateParam = params.get('template') || params.get('preview');
    if (templateParam) {
      const match = templatesData.find(
        (t) => t.id.toLowerCase() === templateParam.toLowerCase() || t.name.toLowerCase() === templateParam.toLowerCase()
      );
      if (match) return match;
    }
    if (window.location.hash.startsWith('#template-')) {
      const templateId = window.location.hash.replace('#template-', '');
      const match = templatesData.find(
        (t) => t.id.toLowerCase() === templateId.toLowerCase() || t.name.toLowerCase() === templateId.toLowerCase()
      );
      if (match) return match;
    }
    return null;
  });

  const [selectedPlanState, setSelectedPlanState] = useState<{
    plan: PricingPlan;
    isYearly: boolean;
  } | null>(null);

  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'signin' | 'signup';
  }>({ open: false, mode: 'signin' });

  const [contactOpen, setContactOpen] = useState(false);
  const [legalTitle, setLegalTitle] = useState<string | null>(null);

  const [phoneAction, setPhoneAction] = useState<{
    type: 'portfolio' | 'booking' | 'shop' | 'gear';
    data?: any;
  } | null>(null);

  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [projectStatsOpen, setProjectStatsOpen] = useState(false);
  const [referralModalOpen, setReferralModalOpen] = useState(false);

  // Hidden Easter Egg state (listening for 'RALOA' or Konami Code)
  const [easterEggActive, setEasterEggActive] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const eggParam = params.get('egg') || params.get('easter_egg');
    return eggParam ? eggParam.toUpperCase() : null;
  });

  // Global listener for secret key sequence (e.g. 'RALOA' or Konami Code: ↑↑↓↓←→←→BA)
  const { reset: resetEasterEgg, trigger: triggerEasterEgg } = useGlobalKeyboardListener({
    onTrigger: (sequenceName) => {
      setEasterEggActive(sequenceName);
    }
  });

  // Synchronize document direction, lang attribute and persistence with selected locale
  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
    persistLocale(locale);
  }, [locale]);

  // Synchronize theme with document element and persistence
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Synchronize ambient audio engine and persistence with soundEnabled state
  useEffect(() => {
    persistSoundEnabled(soundEnabled);
    if (soundEnabled) {
      ambientSound.start();
    } else {
      ambientSound.stop();
    }
  }, [soundEnabled]);

  // If user previously enabled sound, resume on first interaction (respecting browser autoplay policies)
  useEffect(() => {
    if (!soundEnabled) return;

    const handleFirstInteraction = () => {
      if (soundEnabled && !ambientSound.getStatus()) {
        ambientSound.start();
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [soundEnabled]);

  // Template deep links (?template=slug and #template-slug) still open the preview on back/forward.
  useEffect(() => {
    const syncTemplate = () => {
      const params = new URLSearchParams(window.location.search);
      const query = (params.get('template') || params.get('preview') || '').toLowerCase();
      const hash = window.location.hash.startsWith('#template-')
        ? window.location.hash.replace('#template-', '').toLowerCase()
        : '';
      const match = templatesData.find((t) =>
        t.id.toLowerCase() === query || t.name.toLowerCase() === query || t.id.toLowerCase() === hash || t.name.toLowerCase() === hash
      );
      setPreviewTemplate(match || null);
    };

    syncTemplate();
    window.addEventListener('popstate', syncTemplate);
    window.addEventListener('hashchange', syncTemplate);
    return () => {
      window.removeEventListener('popstate', syncTemplate);
      window.removeEventListener('hashchange', syncTemplate);
    };
  }, []);

  const handleReturnHome = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToSection = (sectionId: string) => {
    if (route.name !== 'home') navigate('/');
    window.history.pushState(null, '', `/#${sectionId}`);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  const handleSelectLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    persistLocale(newLocale);
  };

  const toggleLocale = () => {
    const next = locale === 'en' ? 'ar' : 'en';
    handleSelectLocale(next);
  };

  const handleOpenStudio = (username?: string, template?: TemplateItem) => {
    if (username) setStudioUsername(username);
    if (template) setStudioTemplate(template);
    setStudioOpen(true);
  };

  const handleSelectTemplate = (template: TemplateItem) => {
    setPreviewTemplate(template);
    const params = new URLSearchParams(window.location.search);
    params.set('template', template.id);
    window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleClosePreviewTemplate = () => {
    setPreviewTemplate(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('template');
    params.delete('preview');
    const newQuery = params.toString() ? `?${params.toString()}` : '';
    const newHash = window.location.hash.startsWith('#template-') ? '' : window.location.hash;
    window.history.pushState(null, '', `${window.location.pathname}${newQuery}${newHash}`);
  };

  const handleUseTemplateFromPreview = (template: TemplateItem) => {
    handleClosePreviewTemplate();
    handleOpenStudio(undefined, template);
  };

  const handleSelectPlan = (plan: PricingPlan, isYearly: boolean) => {
    setSelectedPlanState({ plan, isYearly });
  };

  const handleConfirmPlan = (plan: PricingPlan) => {
    setSelectedPlanState(null);
    handleOpenStudio();
  };

  // Determine if any modal is currently open
  const isAnyModalOpen = Boolean(
    easterEggActive ||
    shortcutsModalOpen ||
    legalTitle ||
    phoneAction ||
    authModal.open ||
    selectedPlanState ||
    contactOpen ||
    projectStatsOpen ||
    referralModalOpen ||
    previewTemplate ||
    studioOpen
  );

  // Close the active modal in priority order (topmost first)
  const closeTopModal = () => {
    if (easterEggActive) {
      setEasterEggActive(null);
      resetEasterEgg();
      return;
    }
    if (shortcutsModalOpen) {
      setShortcutsModalOpen(false);
      return;
    }
    if (legalTitle) {
      setLegalTitle(null);
      return;
    }
    if (phoneAction) {
      setPhoneAction(null);
      return;
    }
    if (authModal.open) {
      setAuthModal({ open: false, mode: 'signin' });
      return;
    }
    if (selectedPlanState) {
      setSelectedPlanState(null);
      return;
    }
    if (contactOpen) {
      setContactOpen(false);
      return;
    }
    if (projectStatsOpen) {
      setProjectStatsOpen(false);
      return;
    }
    if (referralModalOpen) {
      setReferralModalOpen(false);
      return;
    }
    if (previewTemplate) {
      handleClosePreviewTemplate();
      return;
    }
    if (studioOpen) {
      setStudioOpen(false);
      return;
    }
  };

  // Register global keyboard shortcuts for accessibility and rapid navigation
  useKeyboardShortcuts([
    {
      key: 'Escape',
      description: 'Close active modal or return home',
      ignoreInInputs: false,
      preventDefault: true,
      handler: () => {
        if (isAnyModalOpen) {
          closeTopModal();
        } else if (!isLanding) {
          handleReturnHome();
        } else if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    },
    {
      key: 't',
      description: 'Toggle theme (dark / light)',
      ignoreInInputs: true,
      handler: () => {
        handleToggleTheme();
      }
    },
    {
      key: 'l',
      description: 'Toggle language (English / Arabic)',
      ignoreInInputs: true,
      handler: () => {
        toggleLocale();
      }
    },
    {
      key: 'm',
      description: 'Toggle ambient sound (mute / unmute)',
      ignoreInInputs: true,
      handler: () => {
        handleToggleSound();
      }
    },
    {
      key: 'v',
      description: 'Toggle voice-over tour narration',
      ignoreInInputs: true,
      handler: () => {
        toggleTour();
      }
    },
    {
      key: 'h',
      description: 'Scroll to top or return home',
      ignoreInInputs: true,
      handler: () => {
        if (!isLanding) {
          handleReturnHome();
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    {
      key: '?',
      description: 'Show / hide keyboard shortcuts',
      ignoreInInputs: true,
      handler: () => {
        setShortcutsModalOpen((prev) => !prev);
      }
    }
  ]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white dark:bg-slate-950 text-ink dark:text-slate-100 transition-colors duration-200 font-sans">
      
      {/* Custom Spring-Based Trailing Cursor */}
      {!previewTemplate && <CustomCursor theme={theme} />}

      {/* Global Branded Loading Overlay */}

      {/* 404 Page Not Found or Standard Landing Page */}
      {route.name === 'profile' ? (
        <PublicProfilePage username={route.username ?? ''} locale={locale} onReturnHome={handleReturnHome} />
      ) : route.name === 'studio' ? (
        <StudioShell locale={locale} section={route.studioSection ?? 'overview'} onReturnHome={handleReturnHome} />
      ) : route.name === 'settings' ? (
        <SettingsPage locale={locale} section={route.settingsSection ?? 'profile'} onReturnHome={handleReturnHome} />
      ) : route.name === 'analytics' ? (
        <AnalyticsPage locale={locale} onReturnHome={handleReturnHome} />
      ) : route.name === 'onboarding' ? (
        <OnboardingPage locale={locale} onReturnHome={handleReturnHome} />
      ) : route.name === 'import' ? (
        <ImportPage locale={locale} onReturnHome={handleReturnHome} />
      ) : route.name === 'signin' ? (
        <AuthPage locale={locale} onReturnHome={handleReturnHome} />
      ) : !isLanding ? (
        <NotFound
          locale={locale}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSelectLocale={handleSelectLocale}
          onReturnHome={handleReturnHome}
          onNavigateToSection={handleNavigateToSection}
          attemptedPath={attemptedPath}
        />
      ) : (
        <>
          {/* 00 Fixed Viewport Scroll Progress Bar */}
          <ScrollProgressBar isRtl={locale === 'ar'} />

      {/* Vertical Scroll-Spy Indicator Dots */}

      {/* 01 Sticky Navigation Header */}
      <Header
        locale={locale}
        onSelectLocale={handleSelectLocale}
        onToggleLocale={toggleLocale}
        onOpenStudio={(user) => handleOpenStudio(user)}
        onOpenAuth={(mode) => setAuthModal({ open: true, mode: mode || 'signin' })}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        voiceTourEnabled={voiceTourEnabled}
        voiceTourSpeaking={voiceTourSpeaking}
        onToggleVoiceTour={toggleTour}
        currentSection={tourSection}
        onReplayVoiceTour={replayCurrent}
      />

      <main>
        {/* 01 Hero Section with dynamic motion entrance & scroll parallax */}
        <Hero
          locale={locale}
          heroTemplate={templatesData[0]}
          onOpenStudio={handleOpenStudio}
          onOpenPhoneAction={(type, data) => setPhoneAction({ type, data })}
        />

        {/* 02 Trust & Benefits Section with Auto-Scrolling Marquee */}
        <div id="trust-reveal">
          <TrustAndBenefits
            locale={locale}
          />
        </div>

        {/* 03 Templates Carousel Section */}
        <div id="templates-reveal">
          <TemplateGallery
            locale={locale}
            onSelectTemplate={handleSelectTemplate}
            onBrowseAll={() => handleSelectTemplate(templatesData[0])}
          />
        </div>

        {/* 04 How It Works Section */}
        <div id="how-it-works-reveal">
          <HowItWorks locale={locale} />
        </div>

        {/* 05 Feature Grid Section */}
        <div id="features-reveal">
          <FeatureGrid
            locale={locale}
            onExploreFeatures={() => {
              const pricingEl = document.getElementById('pricing');
              pricingEl?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>

        {/* 06 Testimonials Section */}
        <div id="testimonials-reveal">
          <Testimonials
            locale={locale}
            onSeeMoreStories={() => {
              handleSelectTemplate(templatesData[1]);
            }}
          />
        </div>

        {/* 07 Pricing Table Section */}
        <div id="pricing-reveal">
          <PricingTable
            locale={locale}
            onSelectPlan={handleSelectPlan}
          />
        </div>

        {/* 08 FAQ Accordion Section */}
        <div id="faq-reveal">
          <FAQAccordion
            locale={locale}
            onContactSupport={() => setContactOpen(true)}
          />
        </div>

        {/* 09 Final CTA Banner */}
        <div id="final-cta-reveal">
          <FinalCTA
            locale={locale}
            onOpenStudio={handleOpenStudio}
          />
        </div>
      </main>

      {/* 10 Footer */}
      <div id="footer-reveal">
        <Footer
          locale={locale}
          theme={theme}
          onOpenPrivacyTerms={(title) => setLegalTitle(title)}
          onOpenContact={() => setContactOpen(true)}
          onOpenShortcuts={() => setShortcutsModalOpen(true)}
          onOpenStats={() => setProjectStatsOpen(true)}
          onOpenReferral={() => setReferralModalOpen(true)}
        />
      </div>

      {/* Floating Back to Top Button */}
      <BackToTop locale={locale} />

      {/* Floating Voice-over Tour Controller Widget */}
      <VoiceTourToggle
        enabled={voiceTourEnabled}
        isSpeaking={voiceTourSpeaking}
        onToggle={toggleTour}
        currentSection={tourSection}
        onReplay={replayCurrent}
        variant="floating"
        locale={locale}
      />
    </>
  )}

      {/* --- REAL INTERACTIVE MODALS (0% FAKE IMPLEMENTATION) --- */}

      <Suspense fallback={null}>
        {/* Project Analytics & Stats Modal (Recharts) */}
        <ProjectStatsModal
          isOpen={projectStatsOpen}
          locale={locale}
          onClose={() => setProjectStatsOpen(false)}
          onOpenStudio={() => handleOpenStudio()}
        />

      {/* Keyboard Shortcuts Reference Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        locale={locale}
        onClose={() => setShortcutsModalOpen(false)}
        onTriggerEasterEgg={() => triggerEasterEgg('RALOA')}
      />

      {/* Live Studio Mini-Site Builder */}
        {studioOpen && (
          <StudioModal
            initialUsername={studioUsername}
            initialTemplate={studioTemplate}
            locale={locale}
            onClose={() => setStudioOpen(false)}
          />
        )}
      {/* Template Preview Details Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          locale={locale}
          onClose={handleClosePreviewTemplate}
          onUseTemplate={handleUseTemplateFromPreview}
        />
      )}

      {/* Plan Checkout & Activation Modal */}
      {selectedPlanState && (
        <PlanCheckoutModal
          plan={selectedPlanState.plan}
          isYearly={selectedPlanState.isYearly}
          locale={locale}
          onClose={() => setSelectedPlanState(null)}
          onConfirmPlan={handleConfirmPlan}
        />
      )}

      {/* Hero Phone Interactive Link Modal (Elena's Portfolio, Booking, Shop) */}
      {phoneAction && (
        <MiniSiteDemoModal
          type={phoneAction.type}
          locale={locale}
          onClose={() => setPhoneAction(null)}
          onStartOwnPage={(uname) => {
            setPhoneAction(null);
            handleOpenStudio(uname);
          }}
        />
      )}

      {/* Authentication Modal */}
      {authModal.open && (
        <AuthModal
          initialMode={authModal.mode}
          locale={locale}
          onClose={() => setAuthModal({ open: false, mode: 'signin' })}
          onSuccess={(email) => {
            setAuthModal({ open: false, mode: 'signin' });
            handleOpenStudio(email.split('@')[0]);
          }}
        />
      )}

      {/* Contact Support Modal */}
      {contactOpen && (
        <ContactModal
          locale={locale}
          onClose={() => setContactOpen(false)}
        />
      )}

      {/* Legal & Terms Modal */}
      {legalTitle && (
        <LegalModal
          title={legalTitle}
          locale={locale}
          onClose={() => setLegalTitle(null)}
        />
      )}

      {/* Refer-a-Friend Rewards Modal */}
      {referralModalOpen && (
        <ReferralModal
          isOpen={referralModalOpen}
          locale={locale}
          onClose={() => setReferralModalOpen(false)}
        />
      )}

      {/* Secret Easter Egg Celebration Overlay */}
      <EasterEggOverlay
        isOpen={Boolean(easterEggActive)}
        sequenceName={easterEggActive}
        locale={locale}
        onClose={() => {
          setEasterEggActive(null);
          resetEasterEgg();
        }}
      />
      </Suspense>

    </div>
    </MotionConfig>
  );
}
