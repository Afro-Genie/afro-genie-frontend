import { toApiUrl } from './apiBase';

export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(toApiUrl(url), options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || err.message || 'Request failed');
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

const buildParams = (params?: Record<string, string | number | undefined>) => {
  if (!params) {
    return '';
  }

  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );

  const query = search.toString();
  return query ? `?${query}` : '';
};

// Songs
export const getSongs = (params: Record<string, string | number | undefined>) =>
  apiFetch('/api/songs' + buildParams(params));

export const getSongById = (id: string) => apiFetch('/api/songs/' + id);

export const getSongTranslations = (songId: string) =>
  apiFetch('/api/songs/' + songId + '/translations');

export const getSongsByLanguage = (code: string, limit?: number) =>
  apiFetch('/api/songs/by-language/' + code + (limit ? '?limit=' + limit : ''));

// Artists
export const getArtists = (params?: Record<string, string | number | undefined>) =>
  apiFetch('/api/artists' + buildParams(params));

export const getArtistById = (id: string) => apiFetch('/api/artists/' + id);

// Search
export const searchCatalog = (
  q: string,
  type?: string,
  lang?: string,
  options?: { page?: number; limit?: number; spotifyFallback?: boolean }
) => {
  const params = new URLSearchParams();
  params.set('q', q);
  if (type) params.set('type', type);
  if (lang) params.set('lang', lang);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.spotifyFallback) params.set('spotifyFallback', 'true');
  return apiFetch('/api/search?' + params.toString());
};

export const searchSuggest = (q: string, spotifyFallback?: boolean) => {
  const params = new URLSearchParams({ q });
  if (spotifyFallback) params.set('spotifyFallback', 'true');
  return apiFetch('/api/search/suggest?' + params.toString());
};
