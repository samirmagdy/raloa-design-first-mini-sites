import { publicProfileFixtures } from '../data/fixtures';
import {
  AnalyticsSnapshot,
  PublicProfile,
  RepositoryResult,
  RaloaRepository
} from './repository';

const STORAGE_KEY = 'raloa.mock.repository.v1';

type StoredState = {
  profiles: PublicProfile[];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const readState = (): { state: StoredState; source: RepositoryResult<StoredState>['source'] } => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { state: JSON.parse(stored) as StoredState, source: 'local' };
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  return { state: { profiles: clone(publicProfileFixtures) }, source: 'fixture' };
};

const persistState = (state: StoredState) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

const createAnalytics = (profile: PublicProfile): AnalyticsSnapshot => {
  const seed = profile.username.length * 17;
  return {
    views: 1200 + seed,
    uniqueVisitors: 840 + seed,
    linkClicks: 286 + seed,
    timeline: Array.from({ length: 7 }, (_, index) => ({
      date: `2024-08-${String(index + 1).padStart(2, '0')}`,
      views: 120 + seed + index * 11,
      clicks: 24 + index * 3
    }))
  };
};

export const mockRepository: RaloaRepository = {
  async listProfiles() {
    const { state, source } = readState();
    return { data: clone(state.profiles), source };
  },

  async getProfile(username) {
    const { state, source } = readState();
    const profile = state.profiles.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
    return { data: profile ? clone(profile) : null, source };
  },

  async saveProfile(profile) {
    const { state } = readState();
    const nextProfiles = state.profiles.filter((item) => item.id !== profile.id);
    nextProfiles.push(clone(profile));
    const nextState = { profiles: nextProfiles };
    persistState(nextState);
    return { data: clone(profile), source: 'local' };
  },

  async getAnalytics(username) {
    const profile = await this.getProfile(username);
    const fallback = publicProfileFixtures[0];
    return {
      data: createAnalytics(profile.data ?? fallback),
      source: profile.source
    };
  }
};

