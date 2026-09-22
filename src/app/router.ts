export type RouteName = 'home' | 'profile' | 'studio' | 'settings' | 'analytics' | 'import' | 'onboarding' | 'signin' | 'not-found';

export type StudioSection = 'overview' | 'editor' | 'theme' | 'pages' | 'preview';

export type SettingsSection = 'profile' | 'seo';

export interface Route {
  name: RouteName;
  path: string;
  username?: string;
  studioSection?: StudioSection;
  settingsSection?: SettingsSection;
}

const STUDIO_SECTIONS: StudioSection[] = ['overview', 'editor', 'theme', 'pages', 'preview'];
const SETTINGS_SECTIONS: SettingsSection[] = ['profile', 'seo'];

export const normalizePath = (path: string): string => {
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || '/';
};

const sectionOf = <T extends string>(value: string | undefined, allowed: T[], fallback: T): T =>
  (allowed as string[]).includes(value ?? '') ? (value as T) : fallback;

export const parseAppRoute = (pathname: string): Route => {
  const path = normalizePath(pathname);

  if (path === '/' || path === '/index.html') return { name: 'home', path: '/' };
  if (path === '/signin' || path === '/auth') return { name: 'signin', path: '/signin' };
  if (path === '/analytics') return { name: 'analytics', path };
  if (path === '/import') return { name: 'import', path };
  if (path === '/onboarding') return { name: 'onboarding', path };

  const studioMatch = path.match(/^\/studio(?:\/([a-z-]+))?$/);
  if (studioMatch) {
    const studioSection = sectionOf(studioMatch[1], STUDIO_SECTIONS, 'overview');
    return { name: 'studio', path: `/studio/${studioSection}`, studioSection };
  }

  const settingsMatch = path.match(/^\/settings(?:\/([a-z-]+))?$/);
  if (settingsMatch) {
    const settingsSection = sectionOf(settingsMatch[1], SETTINGS_SECTIONS, 'profile');
    return { name: 'settings', path: `/settings/${settingsSection}`, settingsSection };
  }

  const profileMatch = path.match(/^\/p\/([^/]+)/i);
  if (profileMatch) return { name: 'profile', path, username: decodeURIComponent(profileMatch[1]) };

  const handleMatch = path.match(/^\/(@|profile\/)([^/]+)$/);
  if (handleMatch) return { name: 'profile', path, username: decodeURIComponent(handleMatch[2]).replace(/^@/, '') };

  return { name: 'not-found', path };
};

export const routeEquals = (left: Route, right: Route): boolean =>
  left.name === right.name &&
  left.username === right.username &&
  left.studioSection === right.studioSection &&
  left.settingsSection === right.settingsSection;

type Listener = (route: Route) => void;

const listeners = new Set<Listener>();

const read = (): Route => (typeof window === 'undefined' ? { name: 'home', path: '/' } : parseAppRoute(window.location.pathname));

let current: Route = read();

const emit = () => listeners.forEach((listener) => listener(current));

/**
 * History API only — a document reload would drop an editor draft mid-session, which is what the
 * Phase 4 gate ("Studio navigation works without full-page reloads") is really protecting.
 */
export const navigate = (
  path: string,
  options: { replace?: boolean; scroll?: boolean | number } = {}
): void => {
  if (typeof window === 'undefined') return;
  const target = normalizePath(path);
  const next = parseAppRoute(target);
  const unchanged = routeEquals(next, current) && target === normalizePath(window.location.pathname);

  window.history[options.replace ? 'replaceState' : 'pushState'](null, '', target);
  current = next;
  emit();

  if (options.scroll === false) return;
  window.scrollTo({ top: typeof options.scroll === 'number' ? options.scroll : 0, behavior: 'instant' as ScrollBehavior });
};

export const subscribeToRoute = (listener: Listener): (() => void) => {
  listeners.add(listener);
  const onPopState = () => {
    current = read();
    emit();
  };
  if (typeof window !== 'undefined') window.addEventListener('popstate', onPopState);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState);
  };
};

export const getCurrentRoute = (): Route => current;
