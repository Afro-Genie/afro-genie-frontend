import type { Artist, Song } from '../types';

const BROKEN_IMAGE_HOSTS = new Set(['images.afrogenie.dev']);

export const sanitizeImageUrl = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (BROKEN_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) {
      return '';
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
    name: a.name,
    genre: a.genres?.[0] || '',
    image: sanitizeImageUrl(a.imageUrl || a.image || ''),
    spotifyId: a.spotifyId,
    bio: a.bio,
    popularity: a.popularity,
    followers: a.followers,
    externalUrl: a.externalUrl,
    genres: a.genres,
    updatedAt: a.updatedAt,
    spotifySyncedAt: a.spotifySyncedAt,
  };
};

export const normalizeSong = (s: any): Song | null => {
  if (!s) return null;
  return {
    id: s.id,
    title: s.title,
    artist: s.artist?.name || s.artist || '',
    artistId: s.artistId,
    image: sanitizeImageUrl(s.imageUrl || s.coverImageUrl || s.image || ''),
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    views: s.views,
    year: s.releaseYear,
    genre: s.genres?.[0]?.genre?.name || (Array.isArray(s.genres) ? s.genres[0] : '') || '',
    genres: Array.isArray(s.genres) ? s.genres.map((g: any) => g.genre?.name || g).filter(Boolean) : [],
    language: s.primaryLanguage || s.languages?.[0] || '',
    languages: s.languages || [],
    album: s.albumName,
    releaseDate: s.releaseDate,
    popularity: s.popularity,
    requestCount: s.requestCount,
  };
};
