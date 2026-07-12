import { getAllArtists, getAllGenres, getAllSongs } from './firebaseService';
import { spotifyService } from './spotifyService';
import { featureFlags } from '../config/featureFlags';
import type { Artist, Genre, Song } from '../types';

export type UnifiedSearchEntityType = 'song' | 'artist' | 'genre' | 'album';
export type UnifiedSearchSource = 'local' | 'spotify';

export interface UnifiedSearchResult {
  id: string;
  source: UnifiedSearchSource;
  entityType: UnifiedSearchEntityType;
  title: string;
  subtitle?: string;
  image?: string;
  localId?: string;
  spotifyId?: string;
  externalUrl?: string;
  popularity?: number;
}

export interface UnifiedSearchResponse {
  query: string;
  localResults: UnifiedSearchResult[];
  spotifyResults: UnifiedSearchResult[];
  allResults: UnifiedSearchResult[];
  usedSpotifyFallback: boolean;
}

interface UnifiedSearchOptions {
  localLimit?: number;
  spotifyArtistLimit?: number;
  spotifyTrackLimit?: number;
  maxResults?: number;
  minLocalResultsWithoutFallback?: number;
  forceSpotifyFallback?: boolean;
}

interface LocalSearchCache {
  artists: Artist[];
  songs: Song[];
  genres: Genre[];
  loadedAtMs: number;
}

const DEFAULT_OPTIONS: Required<UnifiedSearchOptions> = {
  localLimit: 30,
  spotifyArtistLimit: 5,
  spotifyTrackLimit: 5,
  maxResults: 30,
  minLocalResultsWithoutFallback: 1,
  forceSpotifyFallback: false,
};

const LOCAL_CACHE_TTL_MS = 60 * 1000;

class UnifiedSearchService {
  private localCache: LocalSearchCache | null = null;

  async search(rawQuery: string, options: UnifiedSearchOptions = {}): Promise<UnifiedSearchResponse> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const query = rawQuery.trim();

    if (!query) {
      return {
        query,
        localResults: [],
        spotifyResults: [],
        allResults: [],
        usedSpotifyFallback: false,
      };
    }

    const localResults = await this.searchLocal(query, mergedOptions.localLimit);
    const shouldUseSpotifyFallback =
      featureFlags.useSpotifyProxy &&
      (mergedOptions.forceSpotifyFallback || localResults.length < mergedOptions.minLocalResultsWithoutFallback);

    const spotifyResults = shouldUseSpotifyFallback
      ? await this.searchSpotify(query, mergedOptions.spotifyArtistLimit, mergedOptions.spotifyTrackLimit, localResults)
      : [];

    const allResults = this.dedupeResults([...localResults, ...spotifyResults]).slice(0, mergedOptions.maxResults);

    return {
      query,
      localResults,
      spotifyResults,
      allResults,
      usedSpotifyFallback: shouldUseSpotifyFallback,
    };
  }

  toSpotifyTrackQuery(result: UnifiedSearchResult): string {
    if (result.entityType !== 'song') {
      return result.title;
    }
    return result.subtitle ? `${result.title} ${result.subtitle}` : result.title;
  }

  private async searchLocal(query: string, limitCount: number): Promise<UnifiedSearchResult[]> {
    const { artists, songs, genres } = await this.getLocalData();
    const normalizedQuery = normalize(query);

    const artistResults: UnifiedSearchResult[] = artists
      .filter((artist) => normalize(artist.name).includes(normalizedQuery))
      .map((artist) => ({
        id: `local-artist-${artist.id}`,
        source: 'local',
      entityType: 'artist' as UnifiedSearchEntityType,
        title: artist.name,
        subtitle: artist.genre || undefined,
        image: artist.image || undefined,
        localId: artist.id,
        spotifyId: artist.spotifyId,
        externalUrl: artist.externalUrl,
        popularity: artist.popularity,
      }));

    const songResults: UnifiedSearchResult[] = songs
      .filter(
        (song) =>
          normalize(song.title).includes(normalizedQuery) ||
          normalize(song.artist).includes(normalizedQuery)
      )
      .map((song) => ({
        id: `local-song-${song.id}`,
        source: 'local',
      entityType: 'song' as UnifiedSearchEntityType,
        title: song.title,
        subtitle: song.artist,
        image: song.image || undefined,
        localId: song.id,
        popularity: song.popularity,
      }));

    const genreResults: UnifiedSearchResult[] = genres
      .filter((genre) => normalize(genre.name).includes(normalizedQuery))
      .map((genre) => ({
        id: `local-genre-${genre.id}`,
        source: 'local',
        entityType: 'genre',
        title: genre.name,
        image: genre.image || undefined,
        localId: genre.id,
      }));

    return this.rankLocalResults([...songResults, ...artistResults, ...genreResults], normalizedQuery).slice(
      0,
      limitCount
    );
  }

  private async searchSpotify(
    query: string,
    artistLimit: number,
    trackLimit: number,
    localResults: UnifiedSearchResult[]
  ): Promise<UnifiedSearchResult[]> {
    const [artists, tracks] = await Promise.all([
      spotifyService.searchArtist(query, artistLimit).catch(() => []),
      spotifyService.searchTracks(query, trackLimit).catch(() => []),
    ]);

    const localKeys = new Set(localResults.map((result) => this.resultKey(result)));

    const artistResults: UnifiedSearchResult[] = artists.map((artist): UnifiedSearchResult => ({
      id: `spotify-artist-${artist.id}`,
      source: 'spotify',
      entityType: 'artist',
      title: artist.name,
      subtitle: artist.genres?.[0] || undefined,
      image: artist.images?.[0]?.url || undefined,
      spotifyId: artist.id,
      externalUrl: artist.external_urls?.spotify,
      popularity: artist.popularity,
    }));

    const trackResults: UnifiedSearchResult[] = tracks.map((track): UnifiedSearchResult => ({
      id: `spotify-song-${track.id}`,
      source: 'spotify',
      entityType: 'song',
      title: track.name,
      subtitle: track.artists?.[0]?.name || 'Unknown',
      image: track.album?.images?.[0]?.url || undefined,
      spotifyId: track.id,
      externalUrl: track.external_urls?.spotify,
      popularity: track.popularity,
    }));

    const spotifyResults = [...artistResults, ...trackResults]
      .filter((result) => !localKeys.has(this.resultKey(result)))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return this.dedupeResults(spotifyResults);
  }

  private async getLocalData(): Promise<{ artists: Artist[]; songs: Song[]; genres: Genre[] }> {
    const now = Date.now();
    if (this.localCache && now - this.localCache.loadedAtMs <= LOCAL_CACHE_TTL_MS) {
      return this.localCache;
    }

    const [artists, songs, genres] = await Promise.all([getAllArtists(), getAllSongs(), getAllGenres()]);
    this.localCache = {
      artists,
      songs,
      genres,
      loadedAtMs: now,
    };
    return this.localCache;
  }

  private rankLocalResults(results: UnifiedSearchResult[], normalizedQuery: string): UnifiedSearchResult[] {
    return [...results].sort((a, b) => {
      const scoreA = this.relevanceScore(a, normalizedQuery);
      const scoreB = this.relevanceScore(b, normalizedQuery);
      return scoreB - scoreA;
    });
  }

  private relevanceScore(result: UnifiedSearchResult, normalizedQuery: string): number {
    let score = 0;
    const normalizedTitle = normalize(result.title);
    const normalizedSubtitle = normalize(result.subtitle || '');

    if (normalizedTitle === normalizedQuery) score += 120;
    else if (normalizedTitle.startsWith(normalizedQuery)) score += 80;
    else if (normalizedTitle.includes(normalizedQuery)) score += 50;

    if (normalizedSubtitle === normalizedQuery) score += 50;
    else if (normalizedSubtitle.startsWith(normalizedQuery)) score += 25;
    else if (normalizedSubtitle.includes(normalizedQuery)) score += 15;

    if (result.entityType === 'song') score += 10;
    if (result.source === 'local') score += 5;

    return score + (result.popularity || 0) / 10;
  }

  private dedupeResults(results: UnifiedSearchResult[]): UnifiedSearchResult[] {
    const seen = new Map<string, UnifiedSearchResult>();

    for (const result of results) {
      const key = this.resultKey(result);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, result);
        continue;
      }

      if (existing.source === 'spotify' && result.source === 'local') {
        seen.set(key, result);
        continue;
      }

      if ((result.popularity || 0) > (existing.popularity || 0)) {
        seen.set(key, result);
      }
    }

    return Array.from(seen.values());
  }

  private resultKey(result: UnifiedSearchResult): string {
    return `${result.entityType}:${normalize(result.title)}:${normalize(result.subtitle || '')}`;
  }
}

const normalize = (value: string): string => value.toLowerCase().trim();

export const unifiedSearchService = new UnifiedSearchService();
