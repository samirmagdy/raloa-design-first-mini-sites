import { templatesData } from '../../data/content';
import { themePresets } from '../../theme/themeRegistry';
import type { TemplateItem } from '../../types';
import type { AnalyticsEvent } from '../contracts/analytics';
import type { ProfileBlock } from '../contracts/block';
import type { PageRecord } from '../storage/database';
import { SCHEMA_VERSION } from '../storage/database';
import type { PublicProfile } from '../contracts/profile';
import type { RaloaDatabase } from '../storage/database';
import type { Id, IsoDateTime, LocalizedText } from '../contracts/common';
import { defaultConfigFor } from '../contracts/blockSchema';

/** Deterministic PRNG so two runs of the mock produce byte-identical analytics. */
const seeded = (seed: string) => {
  let state = [...seed].reduce((accumulator, character) => (accumulator * 31 + character.charCodeAt(0)) % 2147483647, 7);
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const DAY = 86_400_000;
const OWNER_ID = 'usr_demo';

const isoAt = (daysAgo: number, hour = 9): IsoDateTime => {
  const date = new Date(Date.now() - daysAgo * DAY);
  date.setHours(hour, (daysAgo * 7) % 60, 0, 0);
  return date.toISOString();
};

const localized = (en: string, ar: string | undefined): LocalizedText => (ar && ar !== en ? { en, ar } : en);

const pageIdFor = (templateId: string, slug: string) => `profile-${templateId}-page-${slug}`;
const blockIdFor = (pageId: Id, key: string) => `${pageId}-${key}`;

const buildProfile = (template: TemplateItem, index: number): PublicProfile => ({
  id: `profile-${template.id}`,
  ownerId: OWNER_ID,
  username: template.id,
  displayName: template.name,
  role: localized(template.role, template.roleAr),
  bio: localized(template.bio, template.bioAr),
  avatarUrl: template.avatar,
  verified: index < 4,
  published: index !== 5,
  theme: structuredClone(themePresets[index % themePresets.length]),
  seo: {
    title: localized(`${template.name} — links`, `روابط ${template.name}`),
    description: localized(template.bio, template.bioAr),
    indexable: index !== 5
  },
  socials: template.socials.map((social, socialIndex) => ({
    id: `${template.id}-social-${socialIndex}`,
    platform: social.platform,
    url: social.url,
    enabled: socialIndex < 6
  })),
  version: 1,
  createdAt: isoAt(120 - index * 6, 11),
  updatedAt: isoAt(index * 3, 15)
});

const linkBlocks = (pageId: Id, template: TemplateItem): ProfileBlock[] => {
  const blocks: ProfileBlock[] = [
    {
      id: blockIdFor(pageId, 'section-links'),
      pageId,
      parentId: null,
      type: 'section',
      title: localized('Start here', 'ابدأ من هنا'),
      config: {},
      position: 0,
      visible: true,
      version: 1
    },
    ...template.sampleLinks.map((link, linkIndex) => ({
      id: blockIdFor(pageId, link.id),
      pageId,
      parentId: null,
      type: 'link' as const,
      title: localized(link.title, link.titleAr),
      subtitle: link.subtitle ? localized(link.subtitle, link.subtitleAr) : undefined,
      url: link.url.startsWith('#') ? `https://example.com/${link.url.slice(1)}` : link.url,
      config: {},
      position: linkIndex + 1,
      visible: true,
      emphasis: linkIndex === 0 ? ('highlight' as const) : ('none' as const),
      badge: linkIndex === 1 ? { label: localized('New', 'جديد') } : undefined,
      version: 1
    })),
    {
      id: blockIdFor(pageId, 'newsletter'),
      pageId,
      parentId: null,
      type: 'newsletter',
      title: localized('Get the monthly dispatch', 'اشترك في النشرة الشهرية'),
      subtitle: localized('One email a month, no resale of your address.', 'بريد واحد شهرياً بدون إعادة بيع عنوانك.'),
      config: { ...defaultConfigFor('newsletter'), buttonLabel: 'Subscribe' },
      position: template.sampleLinks.length + 1,
      visible: true,
      version: 1
    }
  ];
  return blocks;
};

const extraBlocks = (pageId: Id, index: number): ProfileBlock[] => {
  const random = seeded(pageId);
  const blocks: ProfileBlock[] = [];

  if (index % 2 === 0) {
    blocks.push({
      id: blockIdFor(pageId, 'rich'),
      pageId,
      parentId: null,
      type: 'rich-text',
      content: localized(
        '<p>Selected work, tour dates and the occasional <strong>behind the scenes</strong> note.</p>',
        '<p>أعمال مختارة ومواعيد حفلات وملاحظات <strong>من كواليس العمل</strong>.</p>'
      ),
      config: {},
      position: 100,
      visible: true,
      version: 1
    });
  }

  if (index % 3 === 0) {
    const folderId = blockIdFor(pageId, 'press-kit');
    blocks.push({
      id: folderId,
      pageId,
      parentId: null,
      type: 'folder',
      title: localized('Press kit', 'الملف الصحفي'),
      config: { expanded: random() > 0.5 },
      position: 101,
      visible: true,
      children: [
        {
          id: `${folderId}-bio`,
          pageId,
          parentId: folderId,
          type: 'file-download',
          title: localized('Short bio (PDF)', 'نبذة مختصرة (PDF)'),
          url: 'https://example.com/bio.pdf',
          config: { fileSize: '180 KB', fileType: 'PDF' },
          position: 0,
          visible: true,
          version: 1
        },
        {
          id: `${folderId}-logo`,
          pageId,
          parentId: folderId,
          type: 'file-download',
          title: localized('Logo pack', 'حزمة الشعار'),
          url: 'https://example.com/logo.zip',
          config: { fileSize: '2.4 MB', fileType: 'ZIP' },
          position: 1,
          visible: true,
          version: 1
        }
      ],
      version: 1
    });
  }

  return blocks;
};

const bookingBlocks = (pageId: Id): ProfileBlock[] => [
  {
    id: blockIdFor(pageId, 'calendly'),
    pageId,
    parentId: null,
    type: 'calendly',
    title: localized('Book a 20-minute call', 'احجز مكالمة ٢٠ دقيقة'),
    subtitle: localized('Pick a slot that works for you.', 'اختر الوقت المناسب لك.'),
    url: 'https://calendly.com/raloa-demo/20min',
    config: {},
    position: 0,
    visible: true,
    version: 1
  },
  {
    id: blockIdFor(pageId, 'contact-form'),
    pageId,
    parentId: null,
    type: 'contact-form',
    title: localized('Send a brief', 'أرسل تفاصيل المشروع'),
    config: { formId: 'form-contact-studio' },
    position: 1,
    visible: true,
    version: 1
  },
  {
    id: blockIdFor(pageId, 'hidden-rate'),
    pageId,
    parentId: null,
    type: 'link',
    title: localized('Rate card (not live yet)', 'قائمة الأسعار (غير منشور)'),
    url: 'https://example.com/rates',
    config: {},
    position: 2,
    visible: false,
    version: 1
  }
];

const buildPagesAndBlocks = (template: TemplateItem, index: number) => {
  const profileId = `profile-${template.id}`;
  const linksPageId = pageIdFor(template.id, 'links');
  const pages: PageRecord[] = [
    {
      id: linksPageId,
      profileId,
      title: localized(`${template.name} links`, `روابط ${template.name}`),
      slug: 'links',
      description: localized(template.bio, template.bioAr),
      published: true,
      visibility: 'public',
      position: 0,
      version: 1,
      createdAt: isoAt(120 - index * 6, 11),
      updatedAt: isoAt(index * 3, 15)
    }
  ];
  const blocks: ProfileBlock[] = [
    ...linkBlocks(linksPageId, template),
    ...extraBlocks(linksPageId, index)
  ];

  if (index % 2 === 0) {
    const bookingPageId = pageIdFor(template.id, 'bookings');
    pages.push({
      id: bookingPageId,
      profileId,
      title: localized('Bookings', 'الحجوزات'),
      slug: 'bookings',
      description: localized('Availability and enquiry forms.', 'أوقات التوفر ونماذج التواصل.'),
      published: index !== 4,
      visibility: index === 4 ? 'draft' : 'public',
      position: 1,
      version: 1,
      createdAt: isoAt(60 - index, 10),
      updatedAt: isoAt(index, 12)
    });
    blocks.push(...bookingBlocks(bookingPageId));
  }

  return { pages, blocks, linksPageId };
};

const buildEvents = (
  profileEvents: Array<{ profileId: Id; pageId: Id; linkIds: Id[]; index: number }>
): AnalyticsEvent[] => {
  const events: AnalyticsEvent[] = [];
  const referrers = ['instagram.com', 't.co', 'google.com', 'open.spotify.com', 'linkedin.com'];
  const campaigns = [
    { utmSource: 'instagram', medium: 'social', utmCampaign: 'launch-week' },
    { utmSource: 'newsletter', medium: 'email', utmCampaign: 'april-dispatch' },
    { utmSource: 'google', medium: 'organic' }
  ];

  profileEvents.forEach(({ profileId, pageId, linkIds, index }) => {
    const random = seeded(`events-${profileId}`);
    const visitors = 14 + index * 5;

    for (let day = 0; day < 90; day += 1) {
      const weight = day < 21 ? 1.6 : day < 60 ? 1 : 0.55;
      const views = Math.max(1, Math.round((2 + random() * 9) * weight));

      for (let view = 0; view < views; view += 1) {
        events.push({
          id: `evt_${index}_${day}_${view}`,
          profileId,
          pageId,
          type: 'view',
          occurredAt: isoAt(day, 8 + Math.floor(random() * 12)),
          visitorKey: `vst_${Math.floor(random() * visitors)}`,
          referrer: random() > 0.25 ? referrers[Math.floor(random() * referrers.length)] : undefined,
          utm: random() > 0.45 ? campaigns[Math.floor(random() * campaigns.length)] : undefined
        });
      }

      const clicks = Math.round(views * (0.15 + random() * 0.3));
      for (let click = 0; click < clicks; click += 1) {
        events.push({
          id: `clk_${index}_${day}_${click}`,
          profileId,
          pageId,
          blockId: linkIds[Math.floor(random() * linkIds.length)],
          type: 'click',
          occurredAt: isoAt(day, 9 + Math.floor(random() * 10)),
          visitorKey: `vst_${Math.floor(random() * visitors)}`
        });
      }
    }
  });

  return events;
};

const buildForm = (profileId: Id, pageId: Id) => ({
  id: 'form-contact-studio',
  profileId,
  pageId,
  blockId: blockIdFor(pageId, 'contact-form'),
  title: localized('Work with me', 'تعاون معي'),
  description: localized('Tell me about the project.', 'أخبرني عن المشروع.'),
  submitLabel: localized('Send enquiry', 'إرسال الطلب'),
  successMessage: localized('Thanks — I reply within two working days.', 'شكراً لك، أرد خلال يومي عمل.'),
  enabled: true,
  fields: [
    { id: 'ff-name', kind: 'text' as const, name: 'name', label: localized('Name', 'الاسم'), required: true },
    { id: 'ff-email', kind: 'email' as const, name: 'email', label: localized('Email', 'البريد الإلكتروني'), required: true },
    {
      id: 'ff-budget',
      kind: 'select' as const,
      name: 'budget',
      label: localized('Budget', 'الميزانية'),
      required: false,
      options: ['< 5k', '5–15k', '15k+']
    },
    { id: 'ff-brief', kind: 'textarea' as const, name: 'brief', label: localized('Project brief', 'تفاصيل المشروع'), required: true },
    {
      id: 'ff-consent',
      kind: 'consent' as const,
      name: 'consent',
      label: localized('I agree to be contacted about this enquiry.', 'أوافق على التواصل معي بخصوص هذا الطلب.'),
      required: true
    }
  ],
  version: 1,
  createdAt: isoAt(40, 10),
  updatedAt: isoAt(6, 12)
});

export const createSeedDatabase = (): RaloaDatabase => {
  const built = templatesData.map((template, index) => ({
    profile: buildProfile(template, index),
    ...buildPagesAndBlocks(template, index)
  }));

  const profiles = built.map((entry) => entry.profile);
  const pages = built.flatMap((entry) => entry.pages);
  const blocks = built
    .flatMap((entry) => entry.blocks)
    .map(({ children, ...block }) => ({ ...block, children: undefined } as ProfileBlock));
  const childBlocks = built.flatMap((entry) => entry.blocks).flatMap((block) => block.children ?? []);

  const first = built[0];
  const form = buildForm(first.profile.id, first.linksPageId);

  const submissions = [
    { name: 'Nadia Fawzy', email: 'nadia@studiozero.co', budget: '5–15k', brief: 'Rebrand for a ceramics studio, launch in March.', read: false },
    { name: 'Omar Khaled', email: 'omar@northlight.io', budget: '15k+', brief: 'Showreel edit for a tourism campaign.', read: true },
    { name: 'Lina Haddad', email: 'lina@madebyhand.sa', budget: '< 5k', brief: 'Product photography for a capsule drop.', read: false }
  ].map((values, index) => ({
    id: `sub-${index + 1}`,
    formId: form.id,
    profileId: first.profile.id,
    values: values as unknown as Record<string, string | boolean>,
    submittedAt: isoAt(index * 2 + 1, 13 + index),
    read: values.read,
    pageUrl: `https://raloa.app/@${first.profile.username}`
  }));

  const subscribers = Array.from({ length: 14 }, (_, index) => {
    const owner = built[index % 3];
    const status = index < 10 ? 'active' : index < 12 ? 'pending' : 'unsubscribed';
    return {
      id: `subr_${index + 1}`,
      profileId: owner.profile.id,
      email: `reader${index + 1}@example.com`,
      status: status as 'active' | 'pending' | 'unsubscribed',
      source: { pageId: owner.linksPageId, blockId: blockIdFor(owner.linksPageId, 'newsletter') },
      createdAt: isoAt(index * 4 + 2, 10),
      confirmedAt: status === 'active' ? isoAt(index * 4 + 1, 12) : undefined,
      unsubscribedAt: status === 'unsubscribed' ? isoAt(index, 16) : undefined
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    session: null,
    profiles,
    pages,
    blocks: [...blocks, ...childBlocks],
    media: [
      {
        id: 'media-og-default',
        ownerId: OWNER_ID,
        profileId: first.profile.id,
        kind: 'image',
        filename: 'og-cover.png',
        url: first.profile.avatarUrl,
        storageKey: 'local://media-og-default',
        mimeType: 'image/png',
        sizeBytes: 184_320,
        width: 1200,
        height: 630,
        alt: `${first.profile.displayName} cover`,
        createdAt: isoAt(30, 9)
      }
    ],
    events: buildEvents(built.map((entry, index) => ({
      profileId: entry.profile.id,
      pageId: entry.linksPageId,
      linkIds: templatesData[index].sampleLinks.map((link) => blockIdFor(entry.linksPageId, link.id)),
      index
    }))),
    forms: [form],
    submissions,
    subscribers,
    domains: [
      {
        id: 'domain-1',
        profileId: first.profile.id,
        hostname: 'links.studiozero.co',
        status: 'verified',
        ssl: 'active',
        verificationToken: 'raloa-verify-9f21c4',
        records: [
          { type: 'CNAME', name: 'links', value: 'edges.raloa.app', instruction: 'Point this subdomain at RALOA.' },
          { type: 'TXT', name: '_raloa-challenge.links', value: 'raloa-verify-9f21c4', instruction: 'Proves you control the zone.' }
        ],
        isPrimary: true,
        lastCheckedAt: isoAt(1, 14),
        createdAt: isoAt(22, 11)
      },
      {
        id: 'domain-2',
        profileId: profiles[1]?.id ?? first.profile.id,
        hostname: 'northlight.io',
        status: 'pending',
        ssl: 'provisioning',
        verificationToken: 'raloa-verify-4ab770',
        records: [
          { type: 'A', name: '@', value: '76.76.21.21', instruction: 'Replace existing root A records.' },
          { type: 'TXT', name: '_raloa-challenge', value: 'raloa-verify-4ab770', instruction: 'Proves you control the zone.' }
        ],
        isPrimary: false,
        createdAt: isoAt(2, 9)
      }
    ],
    integrations: [
      {
        id: 'int-instagram',
        profileId: first.profile.id,
        kind: 'instagram',
        state: 'connected',
        enabled: true,
        account: { handle: '@studiozero', connectedAt: isoAt(60, 12) },
        lastSyncAt: isoAt(1, 18),
        syncState: 'idle',
        instagramGrid: { mediaCount: 6, captionLinks: true },
        demo: true
      },
      {
        id: 'int-ga4',
        profileId: first.profile.id,
        kind: 'ga4',
        state: 'connected',
        enabled: true,
        trackingId: 'G-DEMO1234AB',
        syncState: 'idle',
        demo: true
      },
      {
        id: 'int-pixel',
        profileId: first.profile.id,
        kind: 'meta_pixel',
        state: 'disconnected',
        enabled: false,
        syncState: 'idle',
        demo: true
      }
    ],
    apiKeys: [
      {
        id: 'key-1',
        profileId: first.profile.id,
        name: 'Studio sync job',
        scopes: ['profiles:read', 'analytics:read'],
        prefix: 'raloa_demo_k9',
        createdAt: isoAt(70, 10),
        lastUsedAt: isoAt(3, 8),
        expiresAt: null,
        revokedAt: null
      },
      {
        id: 'key-2',
        profileId: first.profile.id,
        name: 'Old laptop',
        scopes: ['profiles:read'],
        prefix: 'raloa_demo_p3',
        createdAt: isoAt(140, 10),
        lastUsedAt: null,
        expiresAt: null,
        revokedAt: isoAt(20, 15)
      }
    ],
    issuedTokens: { 'key-1': 'raloa_demo_k9c1f4a2b7e8d60539', 'key-2': 'raloa_demo_p37d5b1a0c9e2f48613' },
    importJobs: [],
    activeProfileId: first.profile.id
  };
};
