// API client for the Express backend

import { API_BASE_URL } from '../lib/apiBase';

const API_BASE = API_BASE_URL;

let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const isAuthenticated = () => !!accessToken;

class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const storedRefresh = getRefreshToken();
  if (!storedRefresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed', code: 'UNKNOWN' }));
    throw new ApiError(body.error || 'Request failed', body.code || 'UNKNOWN', res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{
      user: { id: string; email: string; displayName: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, displayName: string) =>
    apiRequest<{
      user: { id: string; email: string; displayName: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  refresh: (token: string) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: { id: string; email: string; displayName: string; role: string } }>(
      '/auth/refresh',
      { method: 'POST', body: JSON.stringify({ refreshToken: token }) }
    ),

  logout: (token: string) =>
    apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    }),

  getGoogleUrl: () => `${API_BASE}/auth/google`,
};

// Songs API
export const songsApi = {
  getAll: (params?: {
    cursor?: string;
    limit?: number;
    search?: string;
    genre?: string;
    language?: string;
    artistId?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.genre) q.set('genre', params.genre);
    if (params?.language) q.set('language', params.language);
    if (params?.artistId) q.set('artistId', params.artistId);
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    const qs = q.toString();
    return apiRequest<any>(`/songs${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiRequest<any>(`/songs/${id}`),

  getByLanguage: (languageCode: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return apiRequest<any>(`/songs/by-language/${languageCode}${q}`);
  },

  getTranslations: (id: string) => apiRequest<any>(`/songs/${id}/translations`),

  create: (data: any) =>
    apiRequest<any>('/songs', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/songs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiRequest<any>(`/songs/${id}`, { method: 'DELETE' }),
};

// Artists API
export const artistsApi = {
  getAll: (params?: { cursor?: string; limit?: number; search?: string; genre?: string }) => {
    const q = new URLSearchParams();
    if (params?.cursor) q.set('cursor', params.cursor);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.genre) q.set('genre', params.genre);
    const qs = q.toString();
    return apiRequest<{ data: any[]; nextCursor: string | null; total: number }>(`/artists${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => apiRequest<any>(`/artists/${id}`),

  create: (data: any) =>
    apiRequest<any>('/artists', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/artists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiRequest<any>(`/artists/${id}`, { method: 'DELETE' }),
};

// Translations API
export const translationsApi = {
  request: (songId: string, sourceLang: string, targetLang: string) =>
    apiRequest<any>('/translations/request', {
      method: 'POST',
      body: JSON.stringify({ songId, sourceLang, targetLang }),
    }),

  getStatus: (jobId: string) => apiRequest<any>(`/translations/status/${jobId}`),

  getForSong: (songId: string) => apiRequest<any>(`/translations/${songId}`),

  detectLanguage: (lyrics: string) =>
    apiRequest<any>('/translations/detect-language', {
      method: 'POST',
      body: JSON.stringify({ lyrics }),
    }),

  vote: (id: string, voteType: 'UPVOTE' | 'DOWNVOTE') =>
    apiRequest<any>(`/translations/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ voteType }),
    }),
};

// Search API
export const searchApi = {
  search: (params: { q?: string; type?: string; lang?: string; genre?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.q) q.set('q', params.q);
    if (params.type) q.set('type', params.type);
    if (params.lang) q.set('lang', params.lang);
    if (params.genre) q.set('genre', params.genre);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiRequest<any>(`/search${qs ? `?${qs}` : ''}`);
  },

  suggest: (q: string) => apiRequest<any>(`/search/suggest?q=${encodeURIComponent(q)}`),
};

// Health API
export const healthApi = {
  check: (verbose?: boolean) =>
    apiRequest<any>(`/health${verbose ? '?verbose=true' : ''}`),
};
