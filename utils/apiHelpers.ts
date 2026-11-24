import type { Artist, Song } from '../types';
import { API_BASE_URL } from '../lib/apiBase';

const BROKEN_IMAGE_HOSTS = new Set(['images.afrogenie.dev']);
const BACKEND_UPLOAD_HOSTS = new Set(['afro-genie-backend-production.up.railway.app']);
const API_ORIGIN = /^https?:\/\/[^/]+/i.exec(API_BASE_URL)?.[0] ?? '';

export const toDisplayText = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['name', 'title', 'genre', 'label', 'value']) {
      const nested = toDisplayText(record[key]);
      if (nested) return nested;
    }
  }
  return '';
};

export const sanitizeImageUrl = (raw: unknown): string => {
  const trimmed = toDisplayText(raw).trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (BROKEN_IMAGE_HOSTS.has(host)) {
      return '';
    }
    if (
      parsed.pathname.startsWith('/uploads/') &&
      (BACKEND_UPLOAD_HOSTS.has(host) || parsed.origin === API_ORIGIN)
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return trimmed;
  } catch {
    return '';
  }
};

export const normalizeArtist = (a: any): Artist | null => {
  if (!a) return null;
  return {
    id: a.id,
    name: toDisplayText(a.name),
    genre: toDisplayText(Array.isArray(a.genres) ? a.genres[0] : a.genres || a.genre),
    image: sanitizeImageUrl(a.imageUrl || a.image || ''),
    bio: a.bio,
    popularity: a.popularity,
    followers: a.followers,
    externalUrl: a.externalUrl,
    genres: Array.isArray(a.genres) ? a.genres.map(toDisplayText).filter(Boolean) : [],
    updatedAt: a.updatedAt,
  };
};

export const normalizeSong = (s: any): Song | null => {
  if (!s) return null;
  return {
    id: s.id,
    title: toDisplayText(s.title),
    artist: toDisplayText(s.artist) || toDisplayText(s.artistName),
    artistId: s.artistId || toDisplayText(s.artist?.id),
    image: sanitizeImageUrl(s.imageUrl || s.coverImageUrl || s.image || s.artist?.imageUrl || ''),
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    views: s.views,
    year: s.releaseYear ?? s.year,
    genre: toDisplayText(Array.isArray(s.genres) ? s.genres[0] : s.genres) || toDisplayText(s.genre),
    genres: Array.isArray(s.genres)
      ? s.genres.map(toDisplayText).filter(Boolean)
      : s.genre
      ? [toDisplayText(s.genre)]
      : [],
    language: toDisplayText(s.primaryLanguage || (Array.isArray(s.languages) ? s.languages[0] : '')),
    languages: Array.isArray(s.languages) ? s.languages.map(toDisplayText).filter(Boolean) : [],
    album: s.albumName,
    releaseDate: s.releaseDate,
    popularity: s.popularity,
    requestCount: s.requestCount,
  };
};
