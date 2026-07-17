// API client for the Express backend

import { API_BASE_URL } from "../lib/apiBase";

const API_BASE = API_BASE_URL;

let accessToken: string | null = localStorage.getItem("accessToken");
let refreshToken: string | null = localStorage.getItem("refreshToken");

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

export const isAuthenticated = () => !!accessToken;

class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Auth refresh function injected by AuthContext on mount.
// This is the single source of truth for token refresh — AuthContext owns
// React state updates (user, userProfile) and token lifecycle.
let authRefreshFn: (() => Promise<boolean>) | null = null;

export const setAuthRefreshFn = (fn: (() => Promise<boolean>) | null) => {
  authRefreshFn = fn;
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && refreshToken && authRefreshFn) {
    const refreshed = await authRefreshFn();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: "Request failed", code: "UNKNOWN" }));
    throw new ApiError(
      body.error || "Request failed",
      body.code || "UNKNOWN",
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth API
type AuthUserResponse = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  spotifyId?: string | null;
  spotifyProduct?: string | null;
};
type AuthResultResponse = {
  user: AuthUserResponse;
  accessToken: string;
  refreshToken: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResultResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, displayName: string) =>
    apiRequest<AuthResultResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    }),

  refresh: (token: string) =>
    apiRequest<AuthResultResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: token }),
    }),

  logout: (token: string) =>
    apiRequest<{ success: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: token }),
    }),

  registerArtist: (data: {
    email: string;
    password: string;
    stageName: string;
    genre: string;
    bio: string;
    location?: string;
    website?: string;
    socialLinks?: Record<string, string | undefined>;
    photoURL?: string;
  }) =>
    apiRequest<AuthResultResponse>("/auth/register-artist", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getGoogleUrl: () => `${API_BASE}/auth/google`,

  signInWithSpotify: (accessToken: string) =>
    apiRequest<AuthResultResponse>("/auth/spotify", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    }),

  syncSpotifyProduct: (spotifyAccessToken: string) =>
    apiRequest<{ spotifyProduct: string | null }>(
      "/auth/spotify/sync-product",
      {
        method: "POST",
        body: JSON.stringify({ spotifyAccessToken }),
      },
    ),

  linkSpotify: (spotifyAccessToken: string) =>
    apiRequest<{ spotifyProduct: string | null; linked: boolean }>(
      "/auth/spotify/link",
      {
        method: "POST",
        body: JSON.stringify({ spotifyAccessToken }),
      },
    ),

  forgotPassword: (email: string) =>
    apiRequest<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
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
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.genre) q.set("genre", params.genre);
    if (params?.language) q.set("language", params.language);
    if (params?.artistId) q.set("artistId", params.artistId);
    if (params?.sortBy) q.set("sortBy", params.sortBy);
    if (params?.sortOrder) q.set("sortOrder", params.sortOrder);
    const qs = q.toString();
    return apiRequest<any>(`/songs${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => apiRequest<any>(`/songs/${id}`),

  getByLanguage: (languageCode: string, limit?: number) => {
    const q = limit ? `?limit=${limit}` : "";
    return apiRequest<any>(`/songs/by-language/${languageCode}${q}`);
  },

  getTranslations: (id: string) => apiRequest<any>(`/songs/${id}/translations`),

  create: (data: any) =>
    apiRequest<any>("/songs", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/songs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiRequest<any>(`/songs/${id}`, { method: "DELETE" }),
};

// Artists API
export const artistsApi = {
  getAll: (params?: {
    cursor?: string;
    limit?: number;
    search?: string;
    genre?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.genre) q.set("genre", params.genre);
    const qs = q.toString();
    return apiRequest<{
      data: any[];
      nextCursor: string | null;
      total: number;
    }>(`/artists${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => apiRequest<any>(`/artists/${id}`),

  create: (data: any) =>
    apiRequest<any>("/artists", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/artists/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<any>(`/artists/${id}`, { method: "DELETE" }),
};

// Translations API
export const translationsApi = {
  request: (songId: string, sourceLang: string, targetLang: string) =>
    apiRequest<any>("/translations/request", {
      method: "POST",
      body: JSON.stringify({ songId, sourceLang, targetLang }),
    }),

  getStatus: (jobId: string) =>
    apiRequest<any>(`/translations/status/${jobId}`),

  getForSong: (songId: string) => apiRequest<any>(`/translations/${songId}`),

  detectLanguage: (lyrics: string) =>
    apiRequest<any>("/translations/detect-language", {
      method: "POST",
      body: JSON.stringify({ lyrics }),
    }),

  vote: (id: string, voteType: "UPVOTE" | "DOWNVOTE") =>
    apiRequest<any>(`/translations/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ voteType }),
    }),

  update: (id: string, data: { translatedLyrics: string }) =>
    apiRequest<any>(`/translations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  submitCorrection: (
    id: string,
    correction: { originalText: string; suggestedText: string; reason?: string }
  ) =>
    apiRequest<any>(`/translations/${id}/correction`, {
      method: "POST",
      body: JSON.stringify(correction),
    }),

  directSave: (data: {
    songId: string;
    originalLyrics: string;
    translatedLyrics: string;
    sourceLang: string;
    targetLang: string;
    culturalContext?: string;
    status?: string;
  }) =>
    apiRequest<any>("/translations/direct", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Health API
export const healthApi = {
  check: (verbose?: boolean) =>
    apiRequest<any>(`/health${verbose ? "?verbose=true" : ""}`),
};

// Lyrics API — Structured lyrics data for playback integration
export interface LyricLine {
  time: number;
  text: string;
}

export interface StructuredLyrics {
  songId: string;
  content: string | null;
  syncedLyrics: string | null;
  lyricLines: LyricLine[] | null;
  sourceProvider: string;
  licenseStatus: string;
  language: string | null;
}

export const lyricsApi = {
  /**
   * Get structured lyrics for a song.
   * Returns plain text, synced LRC, parsed timestamp lines,
   * source provider, license status, and detected language.
   */
  getForSong: (songId: string) =>
    apiRequest<StructuredLyrics>(`/lyrics/${songId}`),
};
