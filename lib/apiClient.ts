export async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
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
export const searchCatalog = (q: string, type?: string, lang?: string) =>
  apiFetch(
    '/api/search?q=' +
      encodeURIComponent(q) +
      (type ? '&type=' + encodeURIComponent(type) : '') +
      (lang ? '&lang=' + encodeURIComponent(lang) : '')
  );

export const searchSuggest = (q: string) =>
  apiFetch('/api/search/suggest?q=' + encodeURIComponent(q));
