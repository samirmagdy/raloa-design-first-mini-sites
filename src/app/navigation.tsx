import React, { useCallback, useSyncExternalStore } from 'react';
import { getCurrentRoute, navigate, subscribeToRoute, type Route } from './router';

export const useRoute = (): Route =>
  useSyncExternalStore(subscribeToRoute, getCurrentRoute, () => ({ name: 'home', path: '/' }) as Route);

interface AppLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  /** Opens in a new tab for public-page links, where leaving Studio is intentional. */
  external?: boolean;
}

/** In-app link. `href` stays real so middle-click, copy-link and crawls keep working. */
export const AppLink: React.FC<AppLinkProps> = ({ to, external = false, onClick, children, ...props }) => (
  <a
    href={to}
    {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    onClick={(event) => {
      onClick?.(event);
      if (external || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      navigate(to);
    }}
    {...props}
  >
    {children}
  </a>
);

export const useNavigate = () => useCallback((to: string) => navigate(to), []);
