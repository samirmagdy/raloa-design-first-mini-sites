export type Locale = 'en' | 'ar';

export interface TemplateItem {
  id: string;
  name: string;
  role: string;
  category: 'Portfolio' | 'Creative' | 'Business' | 'Professional' | 'Fitness' | 'Travel' | 'Food' | 'Personal';
  avatar: string;
  coverImage: string;
  bio: string;
  bioAr: string;
  themeColor: string;
  accentGradient: string;
  sampleLinks: {
    id: string;
    title: string;
    titleAr: string;
    subtitle?: string;
    subtitleAr?: string;
    url: string;
    thumbnail?: string;
    type?: 'link' | 'gallery' | 'booking' | 'shop';
  }[];
  socials: {
    platform: 'instagram' | 'x' | 'youtube' | 'linkedin' | 'email' | 'tiktok' | 'github' | 'spotify';
    url: string;
  }[];
}

export interface PricingPlan {
  id: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number; // monthly equivalent when paid annually
  period: string;
  periodAr: string;
  description: string;
  descriptionAr: string;
  popular?: boolean;
  features: string[];
  featuresAr: string[];
  ctaText: string;
  ctaTextAr: string;
  ctaVariant: 'primary' | 'secondary' | 'dark';
}

export interface TestimonialItem {
  id: string;
  quote: string;
  quoteAr: string;
  author: string;
  authorAr: string;
  role: string;
  roleAr: string;
  avatar: string;
  rating: number;
}

export interface FAQItem {
  id: string;
  question: string;
  questionAr: string;
  answer: string;
  answerAr: string;
}

export interface MiniSiteUserConfig {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  templateId: string;
  themeColor: string;
  links: {
    id: string;
    title: string;
    url: string;
    subtitle?: string;
    type?: 'link' | 'gallery' | 'booking' | 'shop';
  }[];
  socials: {
    platform: string;
    url: string;
    enabled: boolean;
  }[];
  verified: boolean;
  published: boolean;
}
