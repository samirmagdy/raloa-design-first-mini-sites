import {
  ALL_EMBED_HOSTS,
  blockDefinitions,
  getBlockDefinition
} from '../contracts/blockRegistry';
import {
  createBlock,
  flattenBlocks,
  isEmail,
  nestBlocks,
  sanitizeRichText,
  validateBlock
} from '../contracts/blockSchema';
import { defaultConfigFor } from '../contracts/blockSchema';
import { localize, nowIso, uid, type Id, type LocalizedText } from '../contracts/common';
import { fail, ok, repositoryError, type PageRequest, type Paginated, type Result } from '../contracts/result';
import { themePresets } from '../../theme/themeRegistry';
import { templatesData } from '../../data/content';
import { mutateDatabase, readDatabase, writeDatabase } from '../storage/store';
import type { PageRecord, RaloaDatabase } from '../storage/database';
import type {
  ApiKeysRepository,
  AnalyticsRepository,
  AuthRepository,
  BlocksRepository,
  DomainsRepository,
  FormsRepository,
  ImportsRepository,
  IntegrationsRepository,
  MediaRepository,
  PagesRepository,
  ProfilesRepository,
  RaloaRepository,
  SubmissionsRepository,
  SubscribersRepository,
  TemplatesRepository,
  ThemesRepository
} from '../repository';
import type { ApiKey, CreatedApiKey } from '../contracts/apiKey';
import type { AnalyticsEvent, AnalyticsSnapshot, AnalyticsRange } from '../contracts/analytics';
import type { ProfileBlock, BlockType } from '../contracts/block';
import type { Credentials, AuthMode, Session } from '../contracts/auth';
import type { CustomDomain } from '../contracts/domain';
import type { FormDefinition, FormSubmission, FormSubmissionValue } from '../contracts/form';
import type { ImportCommitResult, ImportItem, ImportJob, ImportPreview } from '../contracts/importJob';
import type { Integration, IntegrationKind } from '../contracts/integration';
import type { MediaAsset, MediaUploadRequest } from '../contracts/media';
import type { PageDraft, ProfilePage } from '../contracts/page';
import type { ProfileSocial, ProfileSummary, ProfileUsage, PublicProfile, UsernameAvailability } from '../contracts/profile';
import type { Subscriber, SubscribeIntent, SubscribeResult } from '../contracts/subscriber';
import type { Template, TemplateApplyResult } from '../contracts/template';
import type { ThemeConfig } from '../contracts/theme';
import { clone, conflict, database, notFound, respond, unauthorized, validationError } from './transport';

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const RESERVED_USERNAMES = ['admin', 'api', 'app', 'support', 'raloa', 'studio', 'settings', 'analytics', 'import', 'onboarding', 'me'];
const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?:(?<!-)\.[a-z0-9-]{1,63})+$/i;
const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Page/block caps are per profile; the profile cap is per account. */
const LIMITS = {
  free: { profiles: 2, pages: 3, blocks: 25, visits: 10_000 },
  creator: { profiles: 12, pages: 10, blocks: 150, visits: 50_000 },
  business: { profiles: 40, pages: 40, blocks: 500, visits: 500_000 }
} as const;

const profileOf = (db: RaloaDatabase, profileId: Id): PublicProfile | undefined =>
  db.profiles.find((profile) => profile.id === profileId || profile.username === profileId);

const pagesOf = (db: RaloaDatabase, profileId: Id): PageRecord[] =>
  db.pages.filter((page) => page.profileId === profileId).sort((left, right) => left.position - right.position);

const hydratePage = (db: RaloaDatabase, record: PageRecord): ProfilePage => ({
  ...record,
  blocks: nestBlocks(db.blocks.filter((block) => block.pageId === record.id))
});

const touchProfile = (profile: PublicProfile) => {
  profile.updatedAt = nowIso();
  profile.version += 1;
};

const csvCell = (value: unknown): string => {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csv = (rows: Array<Record<string, unknown>>): string => {
  if (rows.length === 0) return '';
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n');
};

const paginate = <T,>(items: T[], request: PageRequest | undefined): Paginated<T> => {
  const limit = Math.max(1, Math.min(request?.limit ?? 25, 100));
  const offset = request?.cursor ? Number(request.cursor) || 0 : 0;
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? String(offset + limit) : null;
  return { items: slice, nextCursor: next, total: items.length };
};

const localizedText = (value: LocalizedText | undefined, locale: 'en' | 'ar' = 'en'): string => localize(value ?? '', locale);

const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || uid('slug');

// --------------------------------------------------------------------------- profiles

const profiles: ProfilesRepository = {
  async list() {
    return respond(() => {
      const db = database();
      const summaries = db.profiles.map<ProfileSummary>((profile) => {
        const page = pagesOf(db, profile.id)[0];
        const blocks = page ? db.blocks.filter((block) => block.pageId === page.id && block.visible && !block.parentId) : [];
        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          role: profile.role,
          avatarUrl: profile.avatarUrl,
          published: profile.published,
          verified: profile.verified,
          pageId: page?.id ?? '',
          pageTitle: page?.title ?? { en: 'No page', ar: 'لا توجد صفحة' },
          visibleBlocks: blocks.length,
          updatedAt: profile.updatedAt
        };
      });
      return ok(summaries);
    });
  },

  async get(profileId) {
    return respond(() => {
      const profile = profileOf(database(), profileId);
      return profile ? ok(clone(profile)) : ok(null);
    });
  },

  async getByUsername(username) {
    return respond(() => {
      const profile = database().profiles.find(
        (item) => item.username.toLowerCase() === username.trim().toLowerCase()
      );
      return profile ? ok(clone(profile)) : ok(null);
    });
  },

  async usage() {
    return respond(() => {
      const db = database();
      const plan = db.session?.user.plan ?? 'creator';
      const limits = LIMITS[plan];
      const activePages = db.pages.filter((page) => page.profileId === db.activeProfileId);
      const blocksUsed = activePages.reduce(
        (total, page) => total + db.blocks.filter((block) => block.pageId === page.id).length,
        0
      );
      const monthlyVisits = db.events.filter(
        (event) => event.type === 'view' && Date.now() - Date.parse(event.occurredAt) < 30 * 86_400_000
      ).length;
      return ok({
        plan,
        profilesUsed: db.profiles.length,
        profileLimit: limits.profiles,
        pagesUsed: db.pages.filter((page) => page.profileId === db.activeProfileId).length,
        pageLimit: limits.pages,
        blocksUsed,
        blockLimit: limits.blocks,
        monthlyVisits,
        visitLimit: limits.visits
      } satisfies ProfileUsage);
    });
  },

  async checkUsername(username) {
    return respond(() => {
      const candidate = username.trim().toLowerCase();
      if (!USERNAME_PATTERN.test(candidate)) return ok('invalid' as UsernameAvailability);
      if (RESERVED_USERNAMES.includes(candidate)) return ok('reserved' as UsernameAvailability);
      const taken = database().profiles.some((profile) => profile.username.toLowerCase() === candidate);
      return ok((taken ? 'taken' : 'available') as UsernameAvailability);
    });
  },

  async create(input) {
    return respond(() => {
      const username = input.username.trim().toLowerCase();
      if (!USERNAME_PATTERN.test(username)) {
        return fail(validationError('username', {
          en: 'Use lowercase letters, numbers and hyphens.',
          ar: 'استخدم حروفاً صغيرة وأرقاماً وشرطات فقط.'
        }));
      }
      if (RESERVED_USERNAMES.includes(username)) {
        return fail(validationError('username', { en: 'That name is reserved.', ar: 'هذا الاسم محجوز.' }));
      }

      const created = mutateDatabase((db) => {
        if (db.profiles.some((profile) => profile.username.toLowerCase() === username)) {
          return { error: validationError('username', { en: 'That username is taken.', ar: 'اسم المستخدم مستخدم بالفعل.' }) } as const;
        }
        if (db.profiles.length >= LIMITS[db.session?.user.plan ?? 'creator'].profiles) {
          return { error: repositoryError('forbidden', { en: 'Profile limit reached for this plan.', ar: 'وصلت إلى حد الملفات لهذا الباقة.' }) } as const;
        }

        const id = `profile-${username}`;
        const timestamp = nowIso();
        const profile: PublicProfile = {
          id,
          ownerId: 'usr_demo',
          username,
          displayName: input.displayName.trim() || username,
          role: input.role ?? { en: 'Creator', ar: 'صانع محتوى' },
          bio: input.bio ?? { en: 'New on RALOA.', ar: 'جديد على رالوا.' },
          avatarUrl: '',
          verified: false,
          published: false,
          theme: clone(themePresets[0]),
          seo: { indexable: false },
          socials: [],
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        const pageId = `${id}-page-links`;
        const page: PageRecord = {
          id: pageId,
          profileId: id,
          title: { en: 'Links', ar: 'الروابط' },
          slug: 'links',
          description: profile.bio,
          published: false,
          visibility: 'draft',
          position: 0,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        const starter = createBlock('link', pageId, 0);
        starter.title = { en: 'Your first link', ar: 'رابطك الأول' };

        db.profiles.push(profile);
        db.pages.push(page);
        db.blocks.push(starter);
        db.activeProfileId = id;
        return { profile: clone(profile) };
      });

      return 'error' in created && created.error ? fail(created.error) : ok(created.profile!);
    });
  },

  async update(profileId, patch, expectedVersion) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        if (profile.version !== expectedVersion) return { error: conflict(profile.version) } as const;

        if (patch.username && patch.username !== profile.username) {
          const candidate = patch.username.trim().toLowerCase();
          if (!USERNAME_PATTERN.test(candidate) || RESERVED_USERNAMES.includes(candidate)) {
            return { error: validationError('username', {
              en: 'That username is not available.',
              ar: 'اسم المستخدم غير متاح.'
            }) } as const;
          }
          if (db.profiles.some((item) => item.id !== profile.id && item.username.toLowerCase() === candidate)) {
            return { error: validationError('username', { en: 'That username is taken.', ar: 'اسم المستخدم مستخدم بالفعل.' }) } as const;
          }
          patch = { ...patch, username: candidate };
        }

        Object.assign(profile, patch, { version: profile.version + 1, updatedAt: nowIso() });
        return { profile: clone(profile) };
      });

      return 'error' in result && result.error ? fail(result.error) : ok(result.profile!);
    });
  },

  async duplicate(profileId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const source = profileOf(db, profileId);
        if (!source) return { error: notFound('profile') } as const;

        let username = `${source.username}-copy`;
        let suffix = 2;
        while (db.profiles.some((profile) => profile.username === username)) {
          username = `${source.username}-copy-${suffix}`;
          suffix += 1;
        }

        const id = `profile-${username}`;
        const timestamp = nowIso();
        const copy: PublicProfile = {
          ...clone(source),
          id,
          username,
          displayName: `${source.displayName} (copy)`,
          published: false,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        db.profiles.push(copy);

        pagesOf(db, source.id).forEach((page, index) => {
          const pageId = `${id}-page-${page.slug || index + 1}`;
          db.pages.push({
            ...clone(page),
            id: pageId,
            profileId: id,
            published: false,
            visibility: 'draft',
            version: 1,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          const blocks = db.blocks.filter((block) => block.pageId === page.id);
          const idMap = new Map<string, string>();
          blocks.forEach((block) => idMap.set(block.id, uid('block')));
          blocks.forEach((block) => db.blocks.push({
            ...clone(block),
            id: idMap.get(block.id)!,
            pageId,
            parentId: block.parentId ? idMap.get(block.parentId) ?? null : null,
            version: 1
          }));
        });

        return { profile: clone(copy) };
      });

      return 'error' in result && result.error ? fail(result.error) : ok(result.profile!);
    });
  },

  async remove(profileId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const index = db.profiles.findIndex((profile) => profile.id === profileId || profile.username === profileId);
        if (index < 0) return { error: notFound('profile') } as const;
        if (db.profiles.length === 1) {
          return { error: repositoryError('forbidden', {
            en: 'Keep at least one profile. Deleting the last one closes your public page.',
            ar: 'احتفظ بملف واحد على الأقل. حذف الملف الأخير يغلق صفحتك العامة.'
          }) } as const;
        }

        const removed = db.profiles.splice(index, 1)[0];
        const pageIds = db.pages.filter((page) => page.profileId === removed.id).map((page) => page.id);
        db.pages = db.pages.filter((page) => page.profileId !== removed.id);
        db.blocks = db.blocks.filter((block) => !pageIds.includes(block.pageId));
        db.forms = db.forms.filter((form) => form.profileId !== removed.id);
        db.submissions = db.submissions.filter((submission) => submission.profileId !== removed.id);
        db.subscribers = db.subscribers.filter((subscriber) => subscriber.profileId !== removed.id);
        db.domains = db.domains.filter((domain) => domain.profileId !== removed.id);
        db.integrations = db.integrations.filter((integration) => integration.profileId !== removed.id);
        db.apiKeys = db.apiKeys.filter((key) => key.profileId !== removed.id);
        db.events = db.events.filter((event) => event.profileId !== removed.id);
        db.media = db.media.filter((asset) => asset.profileId !== removed.id);
        if (db.activeProfileId === removed.id) db.activeProfileId = db.profiles[0]?.id ?? null;
        return {};
      });

      return 'error' in result && result.error ? fail(result.error) : ok(undefined);
    });
  },

  async setPublished(profileId, published) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        profile.published = published;
        profile.seo.indexable = published && profile.seo.indexable !== false;
        touchProfile(profile);
        return { profile: clone(profile) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.profile!);
    });
  },

  async listSocials(profileId) {
    return respond(() => {
      const profile = profileOf(database(), profileId);
      return profile ? ok(clone(profile.socials)) : fail(notFound('profile'));
    });
  },

  async saveSocial(profileId, social) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        if (!isSafeLinkValue(social.url)) {
          return { error: validationError('url', { en: 'Social links must start with https://', ar: 'يجب أن يبدأ رابط التواصل بـ https://' }) } as const;
        }
        const existing = profile.socials.findIndex((item) => item.id === social.id);
        const next = existing >= 0
          ? profile.socials.map((item) => (item.id === social.id ? { ...social } : item))
          : [...profile.socials, { ...social, id: social.id || uid('social') }];
        profile.socials = next;
        touchProfile(profile);
        return { socials: clone(next) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.socials!);
    });
  },

  async removeSocial(profileId, socialId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        profile.socials = profile.socials.filter((social) => social.id !== socialId);
        touchProfile(profile);
        return { socials: clone(profile.socials) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.socials!);
    });
  }
};

const isSafeLinkValue = (value: string | undefined): boolean =>
  Boolean(value && /^(https?:\/\/|mailto:|tel:)/i.test(value.trim()));

// --------------------------------------------------------------------------- pages

const pages: PagesRepository = {
  async list(profileId, options) {
    return respond(() => {
      const db = database();
      const records = pagesOf(db, profileId);
      if (!records.length && !profileOf(db, profileId)) return fail(notFound('profile'));
      return ok(records.map((record) => {
        const page = hydratePage(db, record);
        return options?.withBlocks === false ? { ...page, blocks: [] } : page;
      }));
    });
  },

  async get(pageId) {
    return respond(() => {
      const db = database();
      const record = db.pages.find((page) => page.id === pageId);
      return record ? ok(hydratePage(db, record)) : ok(null);
    });
  },

  async create(profileId, draft) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        const limit = LIMITS[db.session?.user.plan ?? 'creator'].pages;
        if (pagesOf(db, profileId).length >= limit) {
          return { error: repositoryError('forbidden', { en: 'Page limit reached for this plan.', ar: 'وصلت إلى حد الصفحات في هذه الباقة.' }) } as const;
        }
        const slug = slugify(draft.slug || localizedText(draft.title));
        if (pagesOf(db, profileId).some((page) => page.slug === slug)) {
          return { error: validationError('slug', { en: 'Another page already uses this URL.', ar: 'صفحة أخرى تستخدم هذا الرابط.' }) } as const;
        }
        const timestamp = nowIso();
        const record: PageRecord = {
          id: uid('page'),
          profileId: profile.id,
          title: draft.title,
          slug,
          description: draft.description,
          published: false,
          visibility: 'draft',
          position: pagesOf(db, profileId).length,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        db.pages.push(record);
        touchProfile(profile);
        return { page: hydratePage(db, record) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.page!);
    });
  },

  async update(pageId, patch, expectedVersion) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const record = db.pages.find((page) => page.id === pageId);
        if (!record) return { error: notFound('page') } as const;
        if (record.version !== expectedVersion) return { error: conflict(record.version) } as const;
        if (patch.slug) {
          const slug = slugify(patch.slug);
          if (db.pages.some((page) => page.id !== pageId && page.profileId === record.profileId && page.slug === slug)) {
            return { error: validationError('slug', { en: 'Another page already uses this URL.', ar: 'صفحة أخرى تستخدم هذا الرابط.' }) } as const;
          }
          patch = { ...patch, slug };
        }
        Object.assign(record, patch, { version: record.version + 1, updatedAt: nowIso() });
        const profile = profileOf(db, record.profileId);
        if (profile) touchProfile(profile);
        return { page: hydratePage(db, record) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.page!);
    });
  },

  async duplicate(pageId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const source = db.pages.find((page) => page.id === pageId);
        if (!source) return { error: notFound('page') } as const;
        const timestamp = nowIso();
        const slug = `${source.slug}-copy`;
        const record: PageRecord = {
          ...clone(source),
          id: uid('page'),
          title: { en: `${localizedText(source.title, 'en')} copy`, ar: `${localizedText(source.title, 'ar')} نسخة` },
          slug,
          published: false,
          visibility: 'draft',
          position: source.position + 1,
          version: 1,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        db.pages.push(record);
        db.pages
          .filter((page) => page.profileId === source.profileId && page.id !== record.id && page.position > source.position)
          .forEach((page) => { page.position += 1; });

        const blocks = db.blocks.filter((block) => block.pageId === source.id);
        const idMap = new Map<string, string>();
        blocks.forEach((block) => idMap.set(block.id, uid('block')));
        blocks.forEach((block) => db.blocks.push({
          ...clone(block),
          id: idMap.get(block.id)!,
          pageId: record.id,
          parentId: block.parentId ? idMap.get(block.parentId) ?? null : null,
          version: 1
        }));
        return { page: hydratePage(db, record) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.page!);
    });
  },

  async remove(pageId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const record = db.pages.find((page) => page.id === pageId);
        if (!record) return { error: notFound('page') } as const;
        if (pagesOf(db, record.profileId).length <= 1) {
          return { error: repositoryError('forbidden', {
            en: 'A profile keeps at least one page.',
            ar: 'يجب أن يحتفظ الملف بصفحة واحدة على الأقل.'
          }) } as const;
        }
        db.pages = db.pages.filter((page) => page.id !== pageId);
        db.blocks = db.blocks.filter((block) => block.pageId !== pageId);
        pagesOf(db, record.profileId).forEach((page, index) => { page.position = index; });
        return {};
      });
      return 'error' in result && result.error ? fail(result.error) : ok(undefined);
    });
  },

  async reorder(profileId, orderedPageIds) {
    return respond(() => {
      const pages = mutateDatabase((db): Result<ProfilePage[]> => {
        orderedPageIds.forEach((pageId, index) => {
          const record = db.pages.find((page) => page.id === pageId && page.profileId === profileId);
          if (record) record.position = index;
        });
        return ok(pagesOf(db, profileId).map((record) => hydratePage(db, record)));
      });
      return pages;
    });
  },

  async setPublished(pageId, published) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const record = db.pages.find((page) => page.id === pageId);
        if (!record) return { error: notFound('page') } as const;
        record.published = published;
        record.visibility = published ? 'public' : 'draft';
        record.version += 1;
        record.updatedAt = nowIso();
        const profile = profileOf(db, record.profileId);
        if (profile) {
          const anyPublished = pagesOf(db, profile.id).some((page) => page.published);
          if (anyPublished && !profile.published) {
            profile.published = true;
          }
          touchProfile(profile);
        }
        return { page: hydratePage(db, record) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.page!);
    });
  }
};

// --------------------------------------------------------------------------- blocks

const blocks: BlocksRepository = {
  async list(pageId) {
    return respond(() => {
      const db = database();
      if (!db.pages.some((page) => page.id === pageId)) return fail(notFound('page'));
      return ok(nestBlocks(db.blocks.filter((block) => block.pageId === pageId)));
    });
  },

  async create(pageId, block) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const page = db.pages.find((item) => item.id === pageId);
        if (!page) return { error: notFound('page') } as const;
        const candidate: ProfileBlock = {
          ...clone(block),
          id: uid('block'),
          pageId,
          parentId: block.parentId ?? null,
          position: block.position ?? db.blocks.filter((item) => item.pageId === pageId && item.parentId === (block.parentId ?? null)).length,
          version: 1
        };
        const errors = validateBlock(candidate);
        if (errors.length) {
          return { error: repositoryError('validation', {
            en: 'Fix the highlighted fields before adding this block.',
            ar: 'صحح الحقول المحددة قبل إضافة هذه الكتلة.'
          }, { fields: errors }) } as const;
        }
        db.blocks.push(candidate);
        touchProfile(profileOf(db, page.profileId)!);
        return { block: clone(candidate) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.block!);
    });
  },

  async update(pageId, blockId, patch, expectedVersion) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const block = db.blocks.find((item) => item.id === blockId && item.pageId === pageId);
        if (!block) return { error: notFound('block') } as const;
        if (block.version !== expectedVersion) return { error: conflict(block.version) } as const;

        const next: ProfileBlock = { ...block, ...patch, id: block.id, pageId, version: block.version + 1 };
        const errors = validateBlock(next);
        if (errors.length) {
          return { error: repositoryError('validation', {
            en: 'This block still has fields to fix.',
            ar: 'لا تزال هذه الكتلة تحتاج تصحيحاً.'
          }, { fields: errors }) } as const;
        }
        Object.assign(block, patch, { version: block.version + 1 });
        const page = db.pages.find((item) => item.id === pageId);
        if (page) touchProfile(profileOf(db, page.profileId)!);
        return { block: clone(block) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.block!);
    });
  },

  async remove(pageId, blockId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const exists = db.blocks.some((block) => block.id === blockId && block.pageId === pageId);
        if (!exists) return { error: notFound('block') } as const;
        const doomed = new Set<string>([blockId]);
        let grew = true;
        while (grew) {
          grew = false;
          db.blocks.forEach((block) => {
            if (block.parentId && doomed.has(block.parentId) && !doomed.has(block.id)) {
              doomed.add(block.id);
              grew = true;
            }
          });
        }
        db.blocks = db.blocks.filter((block) => !doomed.has(block.id) || block.pageId !== pageId);
        const page = db.pages.find((item) => item.id === pageId);
        if (page) touchProfile(profileOf(db, page.profileId)!);
        return {};
      });
      return 'error' in result && result.error ? fail(result.error) : ok(undefined);
    });
  },

  async duplicate(pageId, blockId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const source = db.blocks.find((block) => block.id === blockId && block.pageId === pageId);
        if (!source) return { error: notFound('block') } as const;
        const copies = new Map<string, string>();
        const related = db.blocks.filter((block) => block.id === blockId || block.parentId === blockId);
        related.forEach((block) => copies.set(block.id, uid('block')));
        related.forEach((block) => db.blocks.push({
          ...clone(block),
          id: copies.get(block.id)!,
          parentId: block.parentId ? copies.get(block.parentId) ?? block.parentId : null,
          position: block.id === blockId ? source.position + 1 : block.position + 0.5,
          version: 1,
          children: undefined
        }));
        db.blocks
          .filter((block) => block.pageId === pageId && !copies.has(block.id) && block.id !== blockId)
          .forEach((block) => { if (block.position > source.position) block.position += 1; });
        const page = db.pages.find((item) => item.id === pageId);
        if (page) touchProfile(profileOf(db, page.profileId)!);
        return { block: clone({ ...source, id: copies.get(blockId)!, position: source.position + 1 }) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.block!);
    });
  },

  async reorder(pageId, orderedBlockIds, parentId = null) {
    return respond(() => {
      const result = mutateDatabase((db): Result<ProfileBlock[]> => {
        if (!db.pages.some((page) => page.id === pageId)) return fail(notFound('page'));
        orderedBlockIds.forEach((blockId, index) => {
          const block = db.blocks.find((item) => item.id === blockId && item.pageId === pageId);
          if (block) {
            block.position = index;
            block.parentId = parentId;
          }
        });
        const page = db.pages.find((item) => item.id === pageId);
        if (page) touchProfile(profileOf(db, page.profileId)!);
        return ok(nestBlocks(db.blocks.filter((block) => block.pageId === pageId)));
      });
      return result;
    });
  },

  async setVisible(pageId, blockId, visible) {
    const version = database().blocks.find((block) => block.id === blockId)?.version ?? 1;
    return blocks.update(pageId, blockId, { visible }, version);
  }
};

// --------------------------------------------------------------------------- themes

const MAX_CUSTOM_CSS = 4000;
const UNSAFE_CSS = /<\/?style|javascript:|expression\s*\(|@import|url\s*\(\s*["']?(?:data:|javascript:)/i;

const themes: ThemesRepository = {
  async get(profileId) {
    return respond(() => {
      const profile = profileOf(database(), profileId);
      return profile ? ok(clone(profile.theme)) : fail(notFound('profile'));
    });
  },

  async save(profileId, theme, expectedVersion) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        if (profile.version !== expectedVersion) return { error: conflict(profile.version) } as const;
        if (theme.customCss && (theme.customCss.length > MAX_CUSTOM_CSS || UNSAFE_CSS.test(theme.customCss))) {
          return { error: validationError('customCss', {
            en: 'This CSS is too long or contains an unsafe rule.',
            ar: 'ملف CSS هذا طويل أو يحتوي قاعدة غير آمنة.'
          }) } as const;
        }
        profile.theme = clone(theme);
        touchProfile(profile);
        return { theme: clone(profile.theme) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.theme!);
    });
  },

  async reset(profileId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;
        profile.theme = clone(themePresets[0]);
        touchProfile(profile);
        return { theme: clone(profile.theme) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.theme!);
    });
  }
};

// --------------------------------------------------------------------------- media

const media: MediaRepository = {
  async list(profileId) {
    return respond(() => {
      const items = database().media.filter((asset) => !profileId || asset.profileId === profileId);
      return ok(clone(items));
    });
  },

  async requestUpload(input: MediaUploadRequest) {
    return respond(() => {
      if (input.sizeBytes > MAX_UPLOAD_BYTES) {
        return fail(repositoryError('validation', { en: 'Files are limited to 5 MB.', ar: 'الحد الأقصى للملف ٥ ميجابايت.' }));
      }
      const allowed = input.kind === 'image'
        ? ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
        : input.kind === 'video'
          ? ['video/mp4', 'video/webm']
          : input.kind === 'audio'
            ? ['audio/mpeg', 'audio/wav']
            : ['application/pdf'];
      if (!allowed.includes(input.mimeType)) {
        return fail(validationError('mimeType', {
          en: `${input.mimeType || 'That type'} is not allowed for ${input.kind} uploads.`,
          ar: `${input.mimeType || 'هذا النوع'} غير مسموح لملفات ${input.kind}.`
        }));
      }
      const asset: MediaAsset = {
        id: uid('media'),
        ownerId: 'usr_demo',
        profileId: input.profileId,
        kind: input.kind,
        filename: input.filename,
        url: '',
        storageKey: `local://pending/${input.filename}`,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        createdAt: nowIso()
      };
      return ok({ asset, uploadUrl: `local://upload/${asset.id}`, expiresAt: new Date(Date.now() + 300_000).toISOString() });
    });
  },

  async upload(file, profileId) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return fail(repositoryError('validation', { en: 'Files are limited to 5 MB.', ar: 'الحد الأقصى للملف ٥ ميجابايت.' }));
    }
    const dataUrl = await readAsDataUrl(file);
    if (!dataUrl.ok) return dataUrl;
    return respond(() => {
      const asset: MediaAsset = {
        id: uid('media'),
        ownerId: 'usr_demo',
        profileId,
        kind: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'file',
        filename: file.name,
        url: dataUrl.data,
        storageKey: `local://${file.name}`,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        createdAt: nowIso()
      };
      mutateDatabase((db) => {
        db.media.unshift(asset);
      });
      return ok(clone(asset));
    });
  },

  async remove(assetId) {
    return respond(() => {
      mutateDatabase((db) => {
        db.media = db.media.filter((asset) => asset.id !== assetId);
      });
      return ok(undefined);
    });
  }
};

/** Reads a picked file into a data URL so uploads work without a storage backend. */
const readAsDataUrl = (file: File): Promise<Result<string>> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(ok(String(reader.result)));
    reader.onerror = () => resolve(fail(repositoryError('validation', {
      en: 'That file could not be read.',
      ar: 'تعذرت قراءة هذا الملف.'
    })));
    reader.readAsDataURL(file);
  });

// --------------------------------------------------------------------------- analytics

const rangeDays = (range: AnalyticsRange): number => (range === '7d' ? 7 : range === '30d' ? 30 : 90);

const emptyTimeline = (days: number) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * 86_400_000);
    return { date: date.toISOString().slice(0, 10), views: 0, clicks: 0 };
  });

const analytics: AnalyticsRepository = {
  async snapshot({ profileId, range }) {
    return respond(() => {
      const db = database();
      const profile = profileOf(db, profileId);
      if (!profile) return fail(notFound('profile'));

      const days = rangeDays(range);
      const since = Date.now() - days * 86_400_000;
      const events = db.events.filter(
        (event) => event.profileId === profile.id && Date.parse(event.occurredAt) >= since
      );
      const timeline = emptyTimeline(days);
      const visitors = new Set<string>();
      const byLink = new Map<Id, { clicks: number }>();
      const referrers = new Map<string, number>();
      const campaigns = new Map<string, { utmSource: string; utmCampaign: string; views: number; clicks: number }>();

      events.forEach((event) => {
        const day = event.occurredAt.slice(0, 10);
        const bucket = timeline.find((entry) => entry.date === day);
        const campaignKey = event.utm ? `${event.utm.source ?? 'direct'}::${event.utm.campaign ?? '(none)'}` : null;

        if (event.type === 'view') {
          visitors.add(event.visitorKey);
          if (bucket) bucket.views += 1;
          if (event.referrer) referrers.set(event.referrer, (referrers.get(event.referrer) ?? 0) + 1);
          if (campaignKey) {
            const entry = campaigns.get(campaignKey) ?? { utmSource: event.utm?.source ?? 'direct', utmCampaign: event.utm?.campaign ?? '(none)', views: 0, clicks: 0 };
            entry.views += 1;
            campaigns.set(campaignKey, entry);
          }
        }
        if (event.type === 'click') {
          if (bucket) bucket.clicks += 1;
          if (event.blockId) {
            const entry = byLink.get(event.blockId) ?? { clicks: 0 };
            entry.clicks += 1;
            byLink.set(event.blockId, entry);
          }
          if (campaignKey) {
            const entry = campaigns.get(campaignKey) ?? { utmSource: event.utm?.source ?? 'direct', utmCampaign: event.utm?.campaign ?? '(none)', views: 0, clicks: 0 };
            entry.clicks += 1;
            campaigns.set(campaignKey, entry);
          }
        }
      });

      const views = events.filter((event) => event.type === 'view').length;
      const linkClicks = events.filter((event) => event.type === 'click').length;
      const formSubmissions = events.filter((event) => event.type === 'form_submit').length;
      const blockIndex = new Map<Id, ProfileBlock>(db.blocks.filter((block) => pagesOf(db, profile.id).some((page) => page.id === block.pageId)).map((block) => [block.id, block]));

      const topLinks = [...byLink.entries()]
        .map(([blockId, entry]) => ({
          blockId,
          title: blockIndex.get(blockId)?.title ?? { en: 'Removed block', ar: 'كتلة محذوفة' },
          clicks: entry.clicks,
          clickThroughRate: views ? entry.clicks / views : 0
        }))
        .sort((left, right) => right.clicks - left.clicks)
        .slice(0, 5);

      return ok({
        range,
        views,
        uniqueVisitors: visitors.size,
        linkClicks,
        formSubmissions,
        clickThroughRate: views ? linkClicks / views : 0,
        timeline,
        topLinks,
        referrers: [...referrers.entries()]
          .map(([host, count]) => ({ host, views: count }))
          .sort((left, right) => right.views - left.views)
          .slice(0, 5),
        campaigns: [...campaigns.values()].sort((left, right) => right.views - left.views).slice(0, 5),
        generatedAt: nowIso()
      } satisfies AnalyticsSnapshot);
    });
  },

  async record(event) {
    return respond(() => {
      mutateDatabase((db) => {
        const entry: AnalyticsEvent = { ...event, id: uid('evt'), occurredAt: nowIso() };
        db.events.push(entry);
        if (db.events.length > 40_000) db.events.splice(0, db.events.length - 40_000);
      });
      return ok(undefined);
    });
  }
};

// --------------------------------------------------------------------------- forms

const forms: FormsRepository = {
  async list(profileId) {
    return respond(() => ok(clone(database().forms.filter((form) => form.profileId === profileId))));
  },

  async get(formId) {
    return respond(() => {
      const form = database().forms.find((item) => item.id === formId);
      return form ? ok(clone(form)) : ok(null);
    });
  },

  async save(form, expectedVersion) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        if (!form.fields.length) {
          return { error: validationError('fields', { en: 'Add at least one field.', ar: 'أضف حقلاً واحداً على الأقل.' }) } as const;
        }
        const index = db.forms.findIndex((item) => item.id === form.id);
        if (index < 0) {
          db.forms.push({ ...clone(form), id: form.id || uid('form'), version: 1, createdAt: nowIso(), updatedAt: nowIso() });
          return { form: clone(db.forms[db.forms.length - 1]) };
        }
        if (expectedVersion !== undefined && db.forms[index].version !== expectedVersion) {
          return { error: conflict(db.forms[index].version) } as const;
        }
        db.forms[index] = { ...db.forms[index], ...clone(form), version: db.forms[index].version + 1, updatedAt: nowIso() };
        return { form: clone(db.forms[index]) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.form!);
    });
  },

  async remove(formId) {
    return respond(() => {
      mutateDatabase((db) => {
        db.forms = db.forms.filter((form) => form.id !== formId);
        db.submissions = db.submissions.filter((submission) => submission.formId !== formId);
      });
      return ok(undefined);
    });
  }
};

const submissions: SubmissionsRepository = {
  async list(profileId, request) {
    return respond(() => {
      const query = (request?.query ?? '').trim().toLowerCase();
      const items = database()
        .submissions.filter((submission) => submission.profileId === profileId)
        .filter((submission) => !query || JSON.stringify(submission.values).toLowerCase().includes(query))
        .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt));
      return ok(paginate(clone(items), request));
    });
  },

  async get(submissionId) {
    return respond(() => {
      const item = database().submissions.find((submission) => submission.id === submissionId);
      return item ? ok(clone(item)) : ok(null);
    });
  },

  async submit(formId, values) {
    return respond(() => {
      const result = mutateDatabase((db): Result<FormSubmission> => {
        const form = db.forms.find((item) => item.id === formId);
        if (!form) return fail(notFound('form'));
        if (!form.enabled) {
          return fail(repositoryError('forbidden', { en: 'This form is closed.', ar: 'هذا النموذج مغلق.' }));
        }

        const missing = form.fields.filter((field) => field.required && !String(values[field.name] ?? '').trim());
        if (missing.length) {
          return fail(repositoryError('validation', {
            en: 'Some required fields are still empty.',
            ar: 'بعض الحقول المطلوبة فارغة.'
          }, { fields: missing.map((field) => ({ field: field.name, message: field.label })) }));
        }

        const submission: FormSubmission = {
          id: uid('sub'),
          formId,
          profileId: form.profileId,
          values,
          submittedAt: nowIso(),
          read: false,
          pageUrl: form.pageId ? `local://page/${form.pageId}` : undefined
        };
        db.submissions.unshift(submission);
        db.events.push({
          id: uid('evt'),
          profileId: form.profileId,
          pageId: form.pageId,
          blockId: form.blockId,
          type: 'form_submit',
          occurredAt: submission.submittedAt,
          visitorKey: `vst_form_${form.id}`
        });
        return ok(clone(submission));
      });
      return result;
    });
  },

  async markRead(submissionId, read) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const item = db.submissions.find((submission) => submission.id === submissionId);
        if (!item) return { error: notFound('submission') } as const;
        item.read = read;
        return { item: clone(item) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.item!);
    });
  },

  async remove(submissionId) {
    return respond(() => {
      mutateDatabase((db) => {
        db.submissions = db.submissions.filter((submission) => submission.id !== submissionId);
      });
      return ok(undefined);
    });
  },

  async exportCsv(profileId) {
    return respond(() => {
      const db = database();
      const formsOfProfile = db.forms.filter((form) => form.profileId === profileId);
      const items = db.submissions.filter((submission) => submission.profileId === profileId);
      const keys = [...new Set(formsOfProfile.flatMap((form) => form.fields.map((field) => field.name)))];
      const rows = items.map((submission) => ({
        submitted_at: submission.submittedAt,
        ...Object.fromEntries(keys.map((key) => [key, submission.values[key] ?? ''])),
        read: submission.read
      }));
      return ok({ filename: `raloa-submissions-${profileId}.csv`, contents: csv(rows) });
    });
  }
};

// --------------------------------------------------------------------------- subscribers

const subscribers: SubscribersRepository = {
  async list(profileId, request) {
    return respond(() => {
      const query = (request?.query ?? '').trim().toLowerCase();
      const items = database()
        .subscribers.filter((subscriber) => subscriber.profileId === profileId)
        .filter((subscriber) => !query || subscriber.email.toLowerCase().includes(query) || subscriber.status.includes(query))
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
      return ok(paginate(clone(items), request));
    });
  },

  async subscribe(intent) {
    return respond(() => {
      const email = intent.email.trim().toLowerCase();
      if (!isEmail(email)) {
        return fail(validationError('email', { en: 'Enter a valid email address.', ar: 'أدخل بريداً إلكترونياً صحيحاً.' }));
      }
      const result = mutateDatabase((db) => {
        const existing = db.subscribers.find(
          (subscriber) => subscriber.profileId === intent.profileId && subscriber.email === email
        );
        if (existing && existing.status === 'active') {
          return { error: validationError('email', { en: 'You are already subscribed.', ar: 'أنت مشترك بالفعل.' }) } as const;
        }
        if (existing && existing.status === 'pending') {
          return { subscriber: clone(existing), token: existing.id };
        }
        const subscriber: Subscriber = existing
          ? { ...existing, status: 'pending', unsubscribedAt: undefined }
          : {
              id: uid('subr'),
              profileId: intent.profileId,
              email,
              status: 'pending',
              source: { pageId: intent.pageId, blockId: intent.blockId },
              createdAt: nowIso()
            };
        if (existing) {
          db.subscribers = db.subscribers.map((item) => (item.id === existing.id ? subscriber : item));
        } else {
          db.subscribers.push(subscriber);
        }
        return { subscriber: clone(subscriber), token: subscriber.id };
      });
      if ('error' in result && result.error) return fail(result.error);
      return ok({
        subscriberId: result.subscriber!.id,
        status: result.subscriber!.status,
        confirmationToken: result.token!,
        demo: true
      } satisfies SubscribeResult);
    });
  },

  async confirm(token) {
    return setSubscription(token, 'active');
  },

  async unsubscribe(token) {
    return setSubscription(token, 'unsubscribed');
  },

  async remove(subscriberId) {
    return respond(() => {
      mutateDatabase((db) => {
        db.subscribers = db.subscribers.filter((subscriber) => subscriber.id !== subscriberId);
      });
      return ok(undefined);
    });
  },

  async exportCsv(profileId) {
    return respond(() => {
      const items = database().subscribers.filter((subscriber) => subscriber.profileId === profileId);
      const rows = items.map((subscriber) => ({
        email: subscriber.email,
        status: subscriber.status,
        created_at: subscriber.createdAt,
        confirmed_at: subscriber.confirmedAt ?? '',
        unsubscribed_at: subscriber.unsubscribedAt ?? ''
      }));
      return ok({ filename: `raloa-subscribers-${profileId}.csv`, contents: csv(rows) });
    });
  }
};

const setSubscription = async (token: string, status: 'active' | 'unsubscribed'): Promise<Result<Subscriber>> =>
  respond(() => {
    const result = mutateDatabase((db) => {
      const subscriber = db.subscribers.find((item) => item.id === token || item.email === token);
      if (!subscriber) return { error: notFound('subscription') } as const;
      subscriber.status = status;
      if (status === 'active') subscriber.confirmedAt = nowIso();
      else subscriber.unsubscribedAt = nowIso();
      return { subscriber: clone(subscriber) };
    });
    return 'error' in result && result.error ? fail(result.error) : ok(result.subscriber!);
  });

// --------------------------------------------------------------------------- domains

const domains: DomainsRepository = {
  async list(profileId) {
    return respond(() => ok(clone(database().domains.filter((domain) => domain.profileId === profileId))));
  },

  async add(profileId, hostname) {
    return respond(() => {
      const candidate = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!HOSTNAME_PATTERN.test(candidate)) {
        return fail(validationError('hostname', {
          en: 'Enter a domain like links.example.com.',
          ar: 'أدخل نطاقاً بهذا الشكل links.example.com.'
        }));
      }
      const result = mutateDatabase((db) => {
        if (db.domains.some((domain) => domain.hostname === candidate)) {
          return { error: validationError('hostname', { en: 'That domain is already connected.', ar: 'هذا النطاق متصل بالفعل.' }) } as const;
        }
        const token = `raloa-verify-${Math.random().toString(36).slice(2, 8)}`;
        const isRoot = !candidate.includes('.') || candidate.split('.').length === 2;
        const domain: CustomDomain = {
          id: uid('domain'),
          profileId,
          hostname: candidate,
          status: 'pending',
          ssl: 'none',
          verificationToken: token,
          records: [
            { type: 'TXT', name: `_raloa-challenge${isRoot ? '' : `.${candidate.split('.')[0]}`}`, value: token, instruction: 'Proves you control this zone.' },
            isRoot
              ? { type: 'A', name: '@', value: '76.76.21.21', instruction: 'Replace existing root A records.' }
              : { type: 'CNAME', name: candidate.split('.')[0], value: 'edges.raloa.app', instruction: 'Point this subdomain at RALOA.' }
          ],
          isPrimary: db.domains.filter((item) => item.profileId === profileId).length === 0,
          createdAt: nowIso()
        };
        db.domains.push(domain);
        return { domain: clone(domain) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.domain!);
    });
  },

  async verify(domainId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const domain = db.domains.find((item) => item.id === domainId);
        if (!domain) return { error: notFound('domain') } as const;
        if (domain.status === 'verified') return { domain: clone(domain) };
        domain.status = 'verifying';
        const looksLikeRaloa = domain.hostname.endsWith('raloa.app');
        db.domains = db.domains.map((item) => (item.id === domainId ? { ...item, status: 'verifying' } : item));
        return { domain: clone(domain), rejected: looksLikeRaloa };
      });
      if ('error' in result && result.error) return fail(result.error);
      if (result.rejected) {
        return fail(repositoryError('validation', {
          en: 'You cannot attach a raloa.app address to a custom domain.',
          ar: 'لا يمكن ربط عنوان raloa.app بنطاق مخصص.'
        }));
      }
      // A real check is a poll against the zone; the mock advances pending -> verified in one step.
      const verified = mutateDatabase((db) => {
        const domain = db.domains.find((item) => item.id === domainId);
        if (!domain) return { error: notFound('domain') } as const;
        domain.status = 'verified';
        domain.ssl = 'active';
        domain.lastCheckedAt = nowIso();
        return { domain: clone(domain) };
      });
      return 'error' in verified && verified.error ? fail(verified.error) : ok(verified.domain!);
    });
  },

  async setPrimary(domainId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const target = db.domains.find((domain) => domain.id === domainId);
        if (!target) return { error: notFound('domain') } as const;
        if (target.status !== 'verified') {
          return { error: repositoryError('forbidden', {
            en: 'Verify the domain before making it primary.',
            ar: 'تحقق من النطاق قبل اعتماده كنطاق أساسي.'
          }) } as const;
        }
        db.domains = db.domains.map((domain) => ({
          ...domain,
          isPrimary: domain.profileId === target.profileId ? domain.id === domainId : domain.isPrimary
        }));
        return { domains: clone(db.domains.filter((domain) => domain.profileId === target.profileId)) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.domains!);
    });
  },

  async remove(domainId) {
    return respond(() => {
      mutateDatabase((db) => {
        db.domains = db.domains.filter((domain) => domain.id !== domainId);
      });
      return ok(undefined);
    });
  }
};

// --------------------------------------------------------------------------- integrations

const TRACKING_PATTERNS: Record<'ga4' | 'meta_pixel', RegExp> = {
  ga4: /^G-[A-Z0-9]{4,12}$/,
  meta_pixel: /^\d{8,16}$/
};

const integrations: IntegrationsRepository = {
  async list(profileId) {
    return respond(() => {
      const db = database();
      const existing = db.integrations.filter((integration) => integration.profileId === profileId);
      const missing = (['instagram', 'ga4', 'meta_pixel'] as IntegrationKind[])
        .filter((kind) => !existing.some((integration) => integration.kind === kind))
        .map<Integration>((kind) => ({
          id: `int-${profileId}-${kind}`,
          profileId,
          kind,
          state: 'disconnected',
          enabled: false,
          syncState: 'idle',
          demo: true
        }));
      return ok(clone([...existing, ...missing]));
    });
  },

  async connect(profileId, kind, handle) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const integration = upsertIntegration(db, profileId, kind);
        integration.state = 'connected';
        integration.enabled = true;
        integration.account = { handle: handle.trim() || '@demo', connectedAt: nowIso() };
        integration.lastSyncAt = nowIso();
        integration.detail = undefined;
        return { integration: clone(integration) };
      });
      return ok(result.integration!);
    });
  },

  async disconnect(profileId, kind) {
    return respond(() => {
      const integration = mutateDatabase((db) => {
        const record = upsertIntegration(db, profileId, kind);
        record.state = 'disconnected';
        record.enabled = false;
        record.account = undefined;
        record.trackingId = undefined;
        record.syncState = 'idle';
        return clone(record);
      });
      return ok(integration);
    });
  },

  async sync(profileId, kind) {
    return respond(() => {
      const integration = mutateDatabase((db) => {
        const record = upsertIntegration(db, profileId, kind);
        if (record.state !== 'connected') {
          record.syncState = 'failed';
          record.detail = 'Connect the account first.';
        } else {
          record.syncState = 'idle';
          record.lastSyncAt = nowIso();
          record.instagramGrid = { mediaCount: record.instagramGrid?.mediaCount ?? 6, captionLinks: true };
        }
        return clone(record);
      });
      return ok(integration);
    });
  },

  async setTrackingId(profileId, kind, trackingId, enabled) {
    return respond(() => {
      if (kind === 'instagram') {
        return fail(repositoryError('unsupported', {
          en: 'Instagram has no tracking id; connect the account instead.',
          ar: 'انستغرام لا يملك معرّف تتبع؛ اربط الحساب بدلاً من ذلك.'
        }));
      }
      const value = trackingId.trim();
      if (value && !TRACKING_PATTERNS[kind].test(value)) {
        return fail(validationError('trackingId', {
          en: kind === 'ga4' ? 'A GA4 measurement id looks like G-1A2B3C4D5E.' : 'A Meta Pixel id is 8–16 digits.',
          ar: kind === 'ga4' ? 'معرّف GA4 يظهر بهذا الشكل G-1A2B3C4D5E.' : 'معرّف Meta Pixel مكوّن من ٨ إلى ١٦ رقماً.'
        }));
      }
      const integration = mutateDatabase((db) => {
        const record = upsertIntegration(db, profileId, kind);
        record.trackingId = value || undefined;
        record.enabled = enabled && Boolean(value);
        record.state = value ? 'connected' : 'disconnected';
        return clone(record);
      });
      return ok(integration);
    });
  }
};

const upsertIntegration = (db: RaloaDatabase, profileId: Id, kind: IntegrationKind): Integration => {
  let record = db.integrations.find((integration) => integration.profileId === profileId && integration.kind === kind);
  if (!record) {
    record = {
      id: `int-${profileId}-${kind}`,
      profileId,
      kind,
      state: 'disconnected',
      enabled: false,
      syncState: 'idle',
      demo: true
    };
    db.integrations.push(record);
  }
  return record;
};

// --------------------------------------------------------------------------- api keys

const apiKeys: ApiKeysRepository = {
  async list(profileId) {
    return respond(() => ok(clone(database().apiKeys.filter((key) => key.profileId === profileId))));
  },

  async create(profileId, input) {
    return respond(() => {
      if (!input.name.trim()) return fail(validationError('name', { en: 'Name the key.', ar: 'أدخل اسماً للمفتاح.' }));
      if (!input.scopes.length) return fail(validationError('scopes', { en: 'Pick at least one scope.', ar: 'اختر صلاحية واحدة على الأقل.' }));
      const created = mutateDatabase((db) => {
        const suffix = Math.random().toString(16).slice(2, 18);
        const prefix = `raloa_demo_${suffix.slice(0, 2)}`;
        const key: ApiKey = {
          id: uid('key'),
          profileId,
          name: input.name.trim(),
          scopes: input.scopes,
          prefix,
          createdAt: nowIso(),
          lastUsedAt: null,
          expiresAt: input.expiresAt ?? null,
          revokedAt: null
        };
        db.apiKeys.push(key);
        db.issuedTokens[key.id] = `${prefix}${suffix.slice(2)}`;
        return clone(key);
      });
      return ok({ ...created, token: database().issuedTokens[created.id] } satisfies CreatedApiKey);
    });
  },

  async revoke(profileId, keyId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const key = db.apiKeys.find((item) => item.id === keyId && item.profileId === profileId);
        if (!key) return { error: notFound('key') } as const;
        key.revokedAt = nowIso();
        delete db.issuedTokens[key.id];
        return { key: clone(key) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.key!);
    });
  }
};

// --------------------------------------------------------------------------- templates

const templateFromContent = (index: number): Template => {
  const template = templatesData[index];
  const theme = themePresets[index % themePresets.length];
  return {
    id: `template-${template.id}`,
    name: { en: template.name, ar: template.name },
    tagline: { en: template.role, ar: template.roleAr },
    category: template.category as Template['category'],
    tags: [template.category, template.themeColor],
    audience: [{ en: template.name, ar: template.name }],
    theme: clone(theme),
    previewImage: template.coverImage,
    isFeatured: index < 3,
    pages: [
      {
        title: { en: 'Links', ar: 'الروابط' },
        slug: 'links',
        blocks: template.sampleLinks.map((link) => ({
          type: 'link' as BlockType,
          title: { en: link.title, ar: link.titleAr },
          subtitle: link.subtitle ? { en: link.subtitle, ar: link.subtitleAr } : undefined,
          url: link.url.startsWith('#') ? `https://example.com/${link.url.slice(1)}` : link.url
        }))
      }
    ]
  };
};

const templates: TemplatesRepository = {
  async list() {
    return respond(() => ok(templatesData.map((_, index) => templateFromContent(index))));
  },

  async get(templateId) {
    return respond(() => {
      const index = templatesData.findIndex((template) => `template-${template.id}` === templateId);
      return index < 0 ? ok(null) : ok(templateFromContent(index));
    });
  },

  async apply(profileId, templateId, options) {
    return respond(() => {
      const index = templatesData.findIndex((template) => `template-${template.id}` === templateId);
      if (index < 0) return fail(notFound('template'));
      const template = templateFromContent(index);

      const result = mutateDatabase((db) => {
        const profile = profileOf(db, profileId);
        if (!profile) return { error: notFound('profile') } as const;

        const stalePageIds = new Set(pagesOf(db, profileId).map((page) => page.id));
        const replacedPages = stalePageIds.size;
        const replacedBlocks = db.blocks.filter((block) => stalePageIds.has(block.pageId)).length;

        db.pages = db.pages.filter((page) => !stalePageIds.has(page.id));
        db.blocks = db.blocks.filter((block) => !stalePageIds.has(block.pageId) && block.pageId !== '');

        template.pages.forEach((pageSeed, pageIndex) => {
          const record: PageRecord = {
            id: uid('page'),
            profileId: profile.id,
            title: pageSeed.title,
            slug: pageSeed.slug || `page-${pageIndex + 1}`,
            description: profile.bio,
            published: false,
            visibility: 'draft',
            position: pageIndex,
            version: 1,
            createdAt: nowIso(),
            updatedAt: nowIso()
          };
          db.pages.push(record);
          pageSeed.blocks.forEach((blockSeed, blockIndex) => {
            const block = createBlock(blockSeed.type, record.id, blockIndex);
            block.title = blockSeed.title;
            block.subtitle = blockSeed.subtitle;
            block.content = blockSeed.content;
            block.url = blockSeed.url;
            block.config = { ...defaultConfigFor(blockSeed.type), ...(blockSeed.config ?? {}) };
            db.blocks.push(block);
          });
        });

        profile.theme = clone(template.theme);
        if (options?.keepSocials === false) profile.socials = [];
        touchProfile(profile);

        return {
          applied: {
            profileId: profile.id,
            replacedPages,
            replacedBlocks,
            preservedFields: [
              'identity' as const,
              ...(options?.keepSocials === false ? [] : ['socials' as const]),
              'seo' as const,
              'media' as const
            ]
          }
        };
      });

      return 'error' in result && result.error ? fail(result.error) : ok(result.applied! satisfies TemplateApplyResult);
    });
  }
};

// --------------------------------------------------------------------------- imports

const importItemsFor = (job: ImportJob): ImportItem[] => {
  const handle = job.input.replace(/^https?:\/\/(linktr\.ee|www\.linktr\.ee)\//i, '').replace(/\/$/, '') || 'creator';
  const seed = [...handle].reduce((total, character) => total + character.charCodeAt(0), 0);
  const titles = [
    { en: 'Portfolio', ar: 'الأعمال' },
    { en: 'Booking', ar: 'الحجز' },
    { en: 'Shop', ar: 'المتجر' },
    { en: 'Newsletter', ar: 'النشرة البريدية' },
    { en: 'Instagram', ar: 'انستغرام' },
    { en: 'Contact', ar: 'تواصل' }
  ];
  const count = 3 + (seed % 4);

  return Array.from({ length: count }, (_, index) => ({
    id: `${job.id}-item-${index}`,
    kind: index === 0 ? 'page' : 'block',
    type: index === 0 ? undefined : index % 4 === 3 ? 'newsletter' : 'link',
    title: { en: titles[index % titles.length].en, ar: titles[index % titles.length].ar },
    subtitle: index % 2 === 0 ? { en: 'Imported from Linktree', ar: 'مستورد من Linktree' } : undefined,
    url: `https://example.com/${handle}/${index + 1}`,
    selected: true,
    duplicateOf: undefined
  }));
};

const imports: ImportsRepository = {
  async start(source, input) {
    return respond(() => {
      const value = input.trim();
      const looksLikeUrl = /^https?:\/\//i.test(value);
      if (source === 'raloa-json') {
        if (!value.startsWith('{')) {
          return fail(validationError('payload', { en: 'Paste the contents of a RALOA export.', ar: 'الصق محتوى ملف تصدير رالوا.' }));
        }
        if (value.length > MAX_IMPORT_BYTES) {
          return fail(repositoryError('validation', { en: 'That export is larger than 1 MB.', ar: 'ملف التصدير أكبر من ١ ميجابايت.' }));
        }
      } else if (!looksLikeUrl && !/^[a-z0-9_.-]{2,30}$/i.test(value)) {
        return fail(validationError('input', {
          en: 'Enter a Linktree URL or @username.',
          ar: 'أدخل رابط Linktree أو @اسم_المستخدم.'
        }));
      }

      const job = mutateDatabase((db) => {
        const record: ImportJob = {
          id: uid('import'),
          source,
          input: value,
          status: 'validating',
          progress: 0,
          createdAt: nowIso()
        };
        db.importJobs.unshift(record);
        db.importJobs = db.importJobs.slice(0, 5);
        return clone(record);
      });
      return ok(job);
    });
  },

  async status(jobId) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const job = db.importJobs.find((item) => item.id === jobId);
        if (!job) return { error: notFound('import job') } as const;
        // Advance strictly forward through the pipeline; a poll must never walk it backwards.
        const sequence: Array<[ImportJob['status'], ImportJob['progress']]> = [
          ['validating', 0],
          ['fetching', 25],
          ['parsing', 50],
          ['ready', 100]
        ];
        const at = sequence.findIndex(([status]) => status === job.status);
        const next = sequence[Math.min(at + 1, sequence.length - 1)];
        job.status = next[0];
        job.progress = next[1];
        if (job.status === 'ready' && !job.preview) {
          job.preview = {
            jobId: job.id,
            source: job.source,
            handle: job.input.replace(/^https?:\/\//i, '').replace(/^@/, ''),
            sourceUrl: /^https?:\/\//i.test(job.input) ? job.input : `https://linktr.ee/${job.input}`,
            items: importItemsFor(job),
            warnings: []
          };
        }
        return { job: clone(job) };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.job!);
    });
  },

  async preview(jobId) {
    return respond(() => {
      const job = database().importJobs.find((item) => item.id === jobId);
      if (!job) return fail(notFound('import job'));
      if (!job.preview) return fail(repositoryError('validation', {
        en: 'The import is still running.',
        ar: 'الاستيراد لم يكتمل بعد.'
      }));
      return ok(clone(job.preview));
    });
  },

  async commit(jobId, profileId, selectedItemIds) {
    return respond(() => {
      const result = mutateDatabase((db) => {
        const job = db.importJobs.find((item) => item.id === jobId);
        const profile = profileOf(db, profileId);
        if (!job?.preview) return { error: notFound('import job') } as const;
        if (!profile) return { error: notFound('profile') } as const;
        if (!selectedItemIds.length) {
          return { error: repositoryError('validation', { en: 'Select at least one item.', ar: 'اختر عنصراً واحداً على الأقل.' }) } as const;
        }

        const targetPage = pagesOf(db, profileId).find((page) => page.position === 0);
        if (!targetPage) return { error: notFound('page') } as const;

        const existingUrls = new Set(
          db.blocks.filter((block) => block.pageId === targetPage.id && block.url).map((block) => String(block.url).toLowerCase())
        );
        const chosen = job.preview.items.filter((item) => selectedItemIds.includes(item.id));
        let createdPages = 0;
        let createdBlocks = 0;
        let skipped = 0;
        let position = db.blocks.filter((block) => block.pageId === targetPage.id && !block.parentId).length;

        chosen.forEach((item) => {
          if (item.kind === 'page') {
            const record: PageRecord = {
              id: uid('page'),
              profileId: profile.id,
              title: item.title,
              slug: slugify(localizedText(item.title)),
              description: item.subtitle ?? item.title,
              published: false,
              visibility: 'draft',
              position: pagesOf(db, profileId).length,
              version: 1,
              createdAt: nowIso(),
              updatedAt: nowIso()
            };
            db.pages.push(record);
            createdPages += 1;
            return;
          }
          if (item.url && existingUrls.has(item.url.toLowerCase())) {
            skipped += 1;
            return;
          }
          const block = createBlock(item.type ?? 'link', targetPage.id, position);
          block.title = item.title;
          block.subtitle = item.subtitle;
          block.url = item.url;
          if (item.url) existingUrls.add(item.url.toLowerCase());
          db.blocks.push(block);
          createdBlocks += 1;
          position += 1;
        });

        job.status = 'committed';
        job.committedAt = nowIso();
        touchProfile(profile);
        return {
          result: {
            jobId: job.id,
            createdPages,
            createdBlocks,
            skippedDuplicates: skipped
          }
        };
      });
      return 'error' in result && result.error ? fail(result.error) : ok(result.result! satisfies ImportCommitResult);
    });
  }
};

// --------------------------------------------------------------------------- auth

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const auth: AuthRepository = {
  async session() {
    return respond(() => {
      const session = database().session;
      if (!session) return ok(null);
      if (Date.parse(session.expiresAt) < Date.now()) {
        mutateDatabase((db) => {
          db.session = null;
        });
        return ok(null);
      }
      return ok(clone(session));
    });
  },

  async signIn(credentials: Credentials, mode: AuthMode = 'signin') {
    return respond(() => {
      const email = credentials.email.trim().toLowerCase();
      if (!isEmail(email)) {
        return fail(validationError('email', { en: 'Enter a valid email address.', ar: 'أدخل بريداً إلكترونياً صحيحاً.' }));
      }
      if (credentials.password.length < 8) {
        return fail(validationError('password', { en: 'Use at least 8 characters.', ar: 'استخدم ٨ أحرف على الأقل.' }));
      }
      const session = mutateDatabase((db) => {
        const record: Session = {
          user: {
            id: 'usr_demo',
            email,
            displayName: email.split('@')[0],
            plan: db.session?.user.plan ?? 'creator',
            createdAt: db.session?.user.createdAt ?? nowIso()
          },
          signedInAt: nowIso(),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
        };
        db.session = record;
        db.activeProfileId = db.profiles[0]?.id ?? null;
        return clone(record);
      });
      return ok({ ...session, user: { ...session.user, plan: mode === 'signup' ? 'free' : session.user.plan } });
    });
  },

  async signOut() {
    return respond(() => {
      mutateDatabase((db) => {
        db.session = null;
      });
      return ok(undefined);
    });
  }
};

export const createMockRepository = (): RaloaRepository => ({
  profiles,
  pages,
  blocks,
  themes,
  media,
  analytics,
  forms,
  submissions,
  subscribers,
  domains,
  integrations,
  apiKeys,
  templates,
  imports,
  auth
});

export const mockRepository = createMockRepository();
