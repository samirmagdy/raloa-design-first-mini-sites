import { templatesData } from './content';
import { PublicProfile, ThemeConfig } from '../services/repository';

const defaultTheme: ThemeConfig = {
  id: 'raloa-light',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  mutedText: '#64748B',
  accent: '#5B5CF6',
  button: {
    radius: 'full',
    variant: 'solid',
    shadow: 'soft'
  },
  typography: {
    family: 'Inter',
    weight: 600,
    scale: 'comfortable'
  }
};

export const publicProfileFixtures: PublicProfile[] = templatesData.map((template) => ({
  id: `profile-${template.id}`,
  username: template.id,
  displayName: template.name,
  role: template.role,
  roleAr: template.roleAr,
  bio: template.bio,
  bioAr: template.bioAr,
  avatarUrl: template.avatar,
  verified: true,
  published: true,
  theme: defaultTheme,
  pages: [
    {
      id: `${template.id}-page`,
      title: `${template.name} links`,
      description: template.bio,
      published: true,
      blocks: template.sampleLinks.map((link) => ({
        id: link.id,
        type: 'link' as const,
        title: link.title,
        subtitle: link.subtitle,
        url: link.url,
        visible: true
      }))
    }
  ],
  socials: template.socials.map((social, index) => ({
    id: `${template.id}-social-${index}`,
    platform: social.platform,
    url: social.url,
    enabled: true
  }))
}));
