export type AppRoute =
  | { name: 'home'; path: '/' }
  | { name: 'profile'; path: '/p/:username'; username: string }
  | { name: 'studio'; path: '/studio' }
  | { name: 'settings'; path: '/settings' }
  | { name: 'analytics'; path: '/analytics' }
  | { name: 'import'; path: '/import' }
  | { name: 'onboarding'; path: '/onboarding' }
  | { name: 'not-found'; path: string };

const normalizePath = (path: string) => {
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || '/';
};

export const parseAppRoute = (pathname: string): AppRoute => {
  const path = normalizePath(pathname);

  if (path === '/' || path === '/index.html') return { name: 'home', path: '/' };
  if (path === '/studio') return { name: 'studio', path };
  if (path === '/settings') return { name: 'settings', path };
  if (path === '/analytics') return { name: 'analytics', path };
  if (path === '/import') return { name: 'import', path };
  if (path === '/onboarding') return { name: 'onboarding', path };

  const profileMatch = path.match(/^\/p\/([^/]+)$/);
  if (profileMatch) {
    return {
      name: 'profile',
      path: '/p/:username',
      username: decodeURIComponent(profileMatch[1])
    };
  }

  return { name: 'not-found', path };
};

export const getCurrentRoute = (): AppRoute => {
  if (typeof window === 'undefined') return { name: 'home', path: '/' };
  return parseAppRoute(window.location.pathname);
};
