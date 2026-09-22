import { createSeedDatabase } from '../mock/seed';
import { normalizeLegacyBlock } from '../contracts/blockSchema';
import type { LegacyProfileBlock } from '../contracts/block';
import type { ThemeConfig } from '../contracts/theme';
import {
  DATABASE_KEY,
  LEGACY_REPOSITORY_KEY,
  NETWORK_KEY,
  type NetworkMode,
  type PageRecord,
  type RaloaDatabase
} from './database';
import type { PublicProfile } from '../contracts/profile';
import type { Id, IsoDateTime } from '../contracts/common';

const nowIso = (): IsoDateTime => new Date().toISOString();

type LegacyThemeConfig = Partial<ThemeConfig>;

interface LegacyPublicProfile {
  id: string;
  username: string;
  displayName: string;
  role: string;
  roleAr: string;
  bio: string;
  bioAr: string;
  avatarUrl: string;
  verified: boolean;
  published: boolean;
  theme: LegacyThemeConfig;
  pages: Array<{
    id: string;
    title: string;
    description: string;
    published: boolean;
    blocks: LegacyProfileBlock[];
  }>;
  socials: PublicProfile['socials'];
}

const legacyStorageKey = (username: string) => `raloa_theme_${username}`;

const migrateFromLegacy = (stored: string): RaloaDatabase | null => {
  try {
    const parsed = JSON.parse(stored) as { profiles?: LegacyPublicProfile[] };
    if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) return null;

    const seed = createSeedDatabase();
    const profiles: PublicProfile[] = [];
    const pages: PageRecord[] = [];
    const blocks = [...seed.blocks];

    parsed.profiles.forEach((legacy) => {
      const createdAt = nowIso();
      profiles.push({
        id: legacy.id,
        ownerId: 'usr_demo',
        username: legacy.username,
        displayName: legacy.displayName,
        role: { en: legacy.role, ar: legacy.roleAr || legacy.role },
        bio: { en: legacy.bio, ar: legacy.bioAr || legacy.bio },
        avatarUrl: legacy.avatarUrl,
        verified: legacy.verified,
        published: legacy.published,
        theme: seed.profiles[0]?.theme ?? ({} as PublicProfile['theme']),
        seo: { description: { en: legacy.bio, ar: legacy.bioAr || legacy.bio }, indexable: legacy.published },
        socials: legacy.socials ?? [],
        version: 1,
        createdAt,
        updatedAt: createdAt
      });

      if (typeof window !== 'undefined') {
        const storedTheme = window.localStorage.getItem(legacyStorageKey(legacy.username));
        if (storedTheme) {
          const profile = profiles[profiles.length - 1];
          try {
            profile.theme = { ...profile.theme, ...(JSON.parse(storedTheme) as PublicProfile['theme']) };
          } catch {
            window.localStorage.removeItem(legacyStorageKey(legacy.username));
          }
        }
      }

      legacy.pages.forEach((page, pageIndex) => {
        pages.push({
          id: page.id,
          profileId: legacy.id,
          title: page.title,
          slug: `page-${pageIndex + 1}`,
          description: page.description,
          published: page.published,
          visibility: page.published ? 'public' : 'draft',
          position: pageIndex,
          version: 1,
          createdAt,
          updatedAt: createdAt
        });

        page.blocks.forEach((block, blockIndex) => {
          const flatten = (incoming: LegacyProfileBlock, position: number, parentId: Id | null) => {
            const normalized = normalizeLegacyBlock(incoming, page.id, position, parentId);
            const children = incoming.children ?? [];
            blocks.push({ ...normalized, children: undefined });
            children.forEach((child, childIndex) => flatten(child, childIndex, normalized.id));
          };
          flatten(block, blockIndex, null);
        });
      });
    });

    const migrated: RaloaDatabase = {
      ...seed,
      profiles: [...profiles, ...seed.profiles.filter((profile) => !profiles.some((imported) => imported.id === profile.id))],
      pages: [...pages, ...seed.pages.filter((page) => !pages.some((imported) => imported.id === page.id))],
      blocks,
      activeProfileId: profiles[0]?.id ?? seed.activeProfileId
    };
    return migrated;
  } catch {
    return null;
  }
};

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage);

let cached: RaloaDatabase | null = null;

export const readDatabase = (): RaloaDatabase => {
  if (cached) return cached;

  if (canUseStorage()) {
    const current = window.localStorage.getItem(DATABASE_KEY);
    if (current) {
      try {
        const parsed = JSON.parse(current) as RaloaDatabase;
        if (parsed.schemaVersion === 2) {
          cached = parsed;
          return cached;
        }
      } catch {
        window.localStorage.removeItem(DATABASE_KEY);
      }
    }

    const legacy = window.localStorage.getItem(LEGACY_REPOSITORY_KEY);
    const migrated = legacy ? migrateFromLegacy(legacy) : null;
    if (migrated) {
      cached = migrated;
      writeDatabase(migrated);
      window.localStorage.removeItem(LEGACY_REPOSITORY_KEY);
      return cached;
    }
  }

  cached = createSeedDatabase();
  if (canUseStorage()) writeDatabase(cached);
  return cached;
};

export const writeDatabase = (database: RaloaDatabase): void => {
  cached = database;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
    } catch {
      // Quota exceeded: the in-memory copy stays authoritative for this session.
    }
  }
};

export const mutateDatabase = <T,>(mutator: (database: RaloaDatabase) => T): T => {
  const database = readDatabase();
  const result = mutator(database);
  writeDatabase(database);
  return result;
};

export const resetDatabase = (): RaloaDatabase => {
  const seeded = createSeedDatabase();
  writeDatabase(seeded);
  return seeded;
};

/** Dev-only: forces the mock to answer like a degraded network so retry/error states are testable. */
export const getNetworkMode = (): NetworkMode => {
  if (!canUseStorage()) return 'normal';
  const mode = window.localStorage.getItem(NETWORK_KEY);
  return mode === 'offline' || mode === 'flaky' || mode === 'slow' ? mode : 'normal';
};

export const setNetworkMode = (mode: NetworkMode): void => {
  if (!canUseStorage()) return;
  if (mode === 'normal') window.localStorage.removeItem(NETWORK_KEY);
  else window.localStorage.setItem(NETWORK_KEY, mode);
};
