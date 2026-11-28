import { toApiUrl } from './apiBase';

type FetchJson = (url: string, options?: RequestInit) => Promise<any>;

const NO_STORE: RequestInit = { cache: 'no-store' };

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

export const getSongById = (id: string, fetcher: FetchJson = apiFetch) =>
  fetcher('/api/songs/' + encodeURIComponent(id), NO_STORE);

export const getSongTranslations = (songId: string, fetcher: FetchJson = apiFetch) =>
  fetcher('/api/songs/' + encodeURIComponent(songId) + '/translations', NO_STORE);

export const getSongsByLanguage = (
  code: string,
  params?: Record<string, string | number | undefined>,
) => apiFetch('/api/songs/by-language/' + encodeURIComponent(code) + buildParams(params));

// Artists
export const getArtists = (params?: Record<string, string | number | undefined>) =>
  apiFetch('/api/artists' + buildParams(params));

export const getArtistById = (id: string) => apiFetch('/api/artists/' + id);

export const getGenres = () => apiFetch('/api/genres');

// Search
export const searchCatalog = (
  q: string,
  type?: string,
  lang?: string,
  options?: { page?: number; limit?: number }
) => {
  const params = new URLSearchParams();
  params.set('q', q);
  if (type) params.set('type', type);
  if (lang) params.set('lang', lang);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  return apiFetch('/api/search?' + params.toString());
};

export const searchSuggest = (q: string) => {
  const params = new URLSearchParams({ q });
  return apiFetch('/api/search/suggest?' + params.toString());
};
