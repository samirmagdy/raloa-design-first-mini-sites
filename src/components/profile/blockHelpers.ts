import { isEmbedUrlAllowed, safeBlockUrl, sanitizeRichText } from '../../services/contracts/blockSchema';

export { isEmbedUrlAllowed, safeBlockUrl, sanitizeRichText };

export const stringConfig = (block: { config: Record<string, unknown> }, key: string, fallback = ''): string =>
  typeof block.config[key] === 'string' ? (block.config[key] as string) : fallback;

export const numberConfig = (block: { config: Record<string, unknown> }, key: string, fallback = 0): number =>
  typeof block.config[key] === 'number' ? (block.config[key] as number) : fallback;

export const listConfig = (block: { config: Record<string, unknown> }, key: string): string[] =>
  Array.isArray(block.config[key]) ? (block.config[key] as unknown[]).filter((item): item is string => typeof item === 'string') : [];

/** Turns a Spotify/YouTube/SoundCloud share link into its embed form. */
export const toEmbedSrc = (url: string): string => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (host.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (parsed.pathname.startsWith('/embed/')) return url;
    }
    if (host.endsWith('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    if (host.endsWith('spotify.com')) {
      const path = parsed.pathname.replace(/^\/embed/, '');
      return `https://open.spotify.com/embed${path}`;
    }
    if (host.endsWith('soundcloud.com')) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&visual=false`;
    }
    return url;
  } catch {
    return url;
  }
};
