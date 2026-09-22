import { useEffect, useState, useMemo } from 'react';
import { Locale } from '../types';

export interface SectionSEOMetadata {
  title: string;
  description: string;
}

export interface UseSEOOptions {
  locale?: Locale;
  activeSection?: string;
  customTitle?: string;
  customDescription?: string;
}

export interface UseSEOReturn {
  currentSection: string;
  title: string;
  description: string;
  canonicalUrl: string;
}

const SECTION_SEO_REGISTRY: Record<string, Record<Locale, SectionSEOMetadata>> = {
  hero: {
    en: {
      title: 'RALOA — Beautiful Mini-Sites for Creators, Freelancers & Businesses',
      description: 'Create a polished mini-site for your links, content, bookings and products. Launch in minutes with RALOA — no coding required.'
    },
    ar: {
      title: 'رالوا — مواقع مصغرة استثنائية لصناع المحتوى والمهنيين والأنشطة التجارية',
      description: 'أنشئ موقعك المصغر الاحترافي لروابطك، منتجاتك، محتواك وحجوزاتك في دقائق معدودة مع رالوا — بدون الحاجة لأي خبرة برمجية.'
    }
  },
  benefits: {
    en: {
      title: 'Creator Benefits & Platform Trust — RALOA',
      description: 'Zero setup friction, 99.9% uptime global edge CDN, lightning-fast mobile loading, and total design freedom for your brand.'
    },
    ar: {
      title: 'مزايا المبدعين وثقة المنصة — رالوا',
      description: 'إطلاق فوري وسلس، شبكة توزيع محتوى فائقة السرعة، أداء مثالي على الهواتف وحرية كاملة لتخصيص علامتك التجارية.'
    }
  },
  templates: {
    en: {
      title: 'Templates & Curated Themes — RALOA Mini-Sites',
      description: 'Explore curated, conversion-crafted aesthetic templates for digital creators, photographers, educators, coaches and modern businesses.'
    },
    ar: {
      title: 'قوالب وتصاميم مميزة — رالوا',
      description: 'استعرض قوالب تفاعلية أنيقة مصممة لزيادة التفاعل والمبيعات لصناع المحتوى، المصورين، المدربين ورواد الأعمال.'
    }
  },
  'how-it-works': {
    en: {
      title: 'How It Works — Launch in 3 Simple Steps | RALOA',
      description: 'Pick a template, customize your bio and interactive links, and publish your custom raloa.app link to your bio in under 3 minutes.'
    },
    ar: {
      title: 'كيف تعمل المنصة — أطلق موقعك في ٣ خطوات | رالوا',
      description: 'اختر قالبك المفضل، خصص ملفك وروابطك التفاعلية، وانشر رابطك المباشر في بايو حساباتك بكل سهولة.'
    }
  },
  features: {
    en: {
      title: 'Creator Tools & Integrated Features — RALOA',
      description: 'Custom domains, instant digital storefronts, calendar bookings, portfolio galleries, real-time analytics, and SEO optimization in one place.'
    },
    ar: {
      title: 'مميزات وأدوات صناع المحتوى — رالوا',
      description: 'نطاقات مخصصة، متجر رقمي متكامل، نظام حجز مواعيد، معارض وسائط متقدمة، وتحليلات فورية في منصة موحدة.'
    }
  },
  testimonials: {
    en: {
      title: 'Creator Stories & Reviews — RALOA',
      description: 'See how thousands of creators, artists, educators and founders elevated their link-in-bio into high-converting personal hubs.'
    },
    ar: {
      title: 'قصص وتقييمات المبدعين — رالوا',
      description: 'تعرف على تجارب آلاف المبدعين والفنانين والمدربين الذين طوروا حضورهم الرقمي عبر منصة رالوا.'
    }
  },
  pricing: {
    en: {
      title: 'Transparent Pricing Plans — Free, Pro & Business | RALOA',
      description: 'Start free forever or unlock custom domains, zero transaction fees, deep analytics and VIP priority support with RALOA Pro.'
    },
    ar: {
      title: 'خطط الأسعار الشفافة — مجانية، احترافية وأعمال | رالوا',
      description: 'ابدأ مجاناً مدى الحياة أو اختر باقة المحترفين للنطاقات المخصصة، بدون عمولات مبيعات، وتحليلات متقدمة ودعم أولوية.'
    }
  },
  faq: {
    en: {
      title: 'Frequently Asked Questions & Support — RALOA',
      description: 'Find answers about custom domains, zero commission digital sales, calendar integrations, and switching from other link services.'
    },
    ar: {
      title: 'الأسئلة الشائعة والدعم الفني — رالوا',
      description: 'إجابات شاملة حول النطاقات المخصصة، البيع الرقمي بدون عمولة، ربط التقويم، والتحويل السلس من المنصات الأخرى.'
    }
  }
};

const TRACKED_SECTION_IDS = [
  'hero',
  'benefits',
  'templates',
  'how-it-works',
  'features',
  'testimonials',
  'pricing',
  'faq'
];

/**
 * Custom hook `useSEO` that dynamically updates document.title, canonical URL,
 * OpenGraph, Twitter, and meta description tags based on the active viewport section
 * and current locale to maximize search discoverability.
 */
export function useSEO({
  locale = 'en',
  activeSection: manualSection,
  customTitle,
  customDescription
}: UseSEOOptions = {}): UseSEOReturn {
  const [detectedSection, setDetectedSection] = useState<string>('hero');

  // Active section takes manual override if provided, else auto-detected section
  const currentSection = manualSection || detectedSection;

  // Observe sections in viewport when no manual section is forced
  useEffect(() => {
    if (manualSection) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      // Find the entry with highest intersection ratio or the one intersecting nearest to center
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      if (visibleEntries.length > 0) {
        // Sort by visibility ratio descending
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const topSectionId = visibleEntries[0].target.id;
        if (topSectionId && TRACKED_SECTION_IDS.includes(topSectionId)) {
          setDetectedSection(topSectionId);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-20% 0px -40% 0px',
      threshold: [0.1, 0.25, 0.5]
    });

    TRACKED_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [manualSection]);

  // Derive title, description, and canonical URL
  const { title, description, canonicalUrl } = useMemo(() => {
    const sectionData = SECTION_SEO_REGISTRY[currentSection]?.[locale] || SECTION_SEO_REGISTRY.hero[locale];
    const finalTitle = customTitle || sectionData.title;
    const finalDescription = customDescription || sectionData.description;

    let baseUrl = 'https://raloa.app';
    if (typeof window !== 'undefined' && window.location) {
      baseUrl = `${window.location.origin}${window.location.pathname}`;
    }

    const hash = currentSection === 'hero' ? '' : `#${currentSection}`;
    const finalCanonicalUrl = `${baseUrl}${hash}`;

    return {
      title: finalTitle,
      description: finalDescription,
      canonicalUrl: finalCanonicalUrl
    };
  }, [currentSection, locale, customTitle, customDescription]);

  // Synchronize document.title and meta tags dynamically
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Update Title
    document.title = title;

    // Helper to safely upsert meta tag
    const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Update Primary Description
    setMetaTag('name', 'description', description);

    // 3. Update OpenGraph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', 'website');

    // 4. Update Twitter Card Tags
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // 5. Update or Create Canonical Link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalUrl]);

  return {
    currentSection,
    title,
    description,
    canonicalUrl
  };
}
