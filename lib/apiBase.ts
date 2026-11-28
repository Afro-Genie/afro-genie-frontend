const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();

const resolveFallbackApiBase = (): string => {
  if (typeof window === 'undefined') {
    return '/api';
  }

  const host = window.location.hostname.toLowerCase();

  if (host === 'afro-genie-staging.vercel.app') {
    return 'https://afro-genie-backend-production.up.railway.app/api';
  }
  return '/api';
};

export const API_BASE_URL = rawApiBase
  ? trimTrailingSlash(rawApiBase)
  : trimTrailingSlash(resolveFallbackApiBase());

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const BROKEN_IMAGE_HOSTS = new Set(['images.afrogenie.dev']);
const BACKEND_UPLOAD_HOSTS = new Set(['afro-genie-backend-production.up.railway.app']);
const API_ORIGIN = /^https?:\/\/[^/]+/i.exec(API_BASE_URL)?.[0] ?? '';
const FACEBOOK_CDN_HOST = /\.fbcdn\.net$/i;

const toDisplayText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toDisplayText).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['url', 'src', 'imageUrl', 'photoUrl', 'name', 'title']) {
      const nested = toDisplayText(record[key]);
      if (nested) return nested;
    }
  }
  return '';
};

export const resolveMediaUrl = (raw: unknown): string => {
  const value = toDisplayText(raw).trim();
  if (!value) return '';

  if (/^data:image\//i.test(value) || /^blob:/i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return typeof window === 'undefined' ? `https:${value}` : `${window.location.protocol}${value}`;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    const host = parsed.hostname.toLowerCase();
    if (BROKEN_IMAGE_HOSTS.has(host) || FACEBOOK_CDN_HOST.test(host)) {
      return '';
    }

    if (
      parsed.pathname.startsWith('/uploads/') &&
      (BACKEND_UPLOAD_HOSTS.has(host) || parsed.origin === API_ORIGIN)
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }

    return value;
  } catch {
    return '';
  }
};

export const toApiUrl = (path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }

  if (path === '/api') {
    return API_BASE_URL;
  }

  if (path.startsWith('/api/')) {
    return `${API_BASE_URL}${path.slice(4)}`;
  }

  return `${API_BASE_URL}${path}`;
};

/**
 * Resolve a media path (e.g. "/uploads/xxx.mp3") to a full URL.
 * Uploaded media is served by the backend at /uploads (outside /api).
 */
export const toMediaUrl = (url: unknown): string => {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return '';
  if (isAbsoluteUrl(resolved)) return resolved;
  if (resolved.startsWith('/uploads/')) {
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}${resolved}`;
  }
  return resolved;
};