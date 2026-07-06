const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const rawApiBase = (import.meta.env.VITE_API_URL || '').trim();

const resolveFallbackApiBase = (): string => {
  if (typeof window === 'undefined') {
    return '/api';
  }

  const host = window.location.hostname.toLowerCase();

  if (host === 'afro-genie-staging.vercel.app') {
    return 'https://afro-genie-backend-staging-production.up.railway.app/api';
  }

  if (host === 'afro-genie.vercel.app') {
    return 'https://afro-genie-backend-production.up.railway.app/api';
  }

  return '/api';
};

export const API_BASE_URL = rawApiBase
  ? trimTrailingSlash(rawApiBase)
  : trimTrailingSlash(resolveFallbackApiBase());

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

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