import { apiRequest } from './api';
import { spotifyAuthService } from './spotifyAuthService';

interface SpotifyArtist {
  id: string;
  name: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  genres?: string[];
  popularity?: number;
  followers?: { total: number };
  external_urls?: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
  release_date?: string;
  release_date_precision?: string;
  total_tracks?: number;
  artists?: SpotifyArtist[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album?: SpotifyAlbum;
  duration_ms?: number;
  popularity?: number;
  external_urls?: { spotify: string };
  preview_url?: string;
}

export interface SpotifyTrackSummary {
  id: string;
  name: string;
  artistName: string;
  albumName: string | null;
  imageUrl: string | null;
  previewUrl: string | null;
  spotifyUri: string | null;
  durationMs: number;
  externalUrl: string | null;
}

interface SpotifySearchResponse {
  artists?: {
    items: SpotifyArtist[];
    total: number;
  };
  tracks?: {
    items: SpotifyTrack[];
    total: number;
  };
  albums?: {
    items: SpotifyAlbum[];
    total: number;
  };
}

class SpotifyService {
  private static readonly SPOTIFY_API = 'https://api.spotify.com/v1';
  private static cooldownUntil = 0;
  private inflightRequests = new Map<string, Promise<unknown>>();

  // Track result cache: caches resolved SpotifyTrackSummary by track ID.
  // Avoids re-fetching the same track metadata from the API on repeated loads.
  private trackCache = new Map<string, SpotifyTrackSummary>();
  // Null-preview set: tracks known to have preview_url === null.
  // Prevents repeated API calls for tracks that are confirmed un-previewable.
  private nullPreviewIds = new Set<string>();
  // Cache TTL: 10 minutes
  private static readonly CACHE_TTL_MS = 10 * 60 * 1000;
  private cacheTimestamps = new Map<string, number>();

  private isCacheValid(key: string): boolean {
    const ts = this.cacheTimestamps.get(key);
    if (!ts) return false;
    return Date.now() - ts < SpotifyService.CACHE_TTL_MS;
  }

  private setCache(key: string, value: SpotifyTrackSummary): void {
    // Evict oldest entries when cache exceeds 200 tracks
    if (this.trackCache.size >= 200) {
      const oldestKey = this.cacheTimestamps.keys().next().value;
      if (oldestKey) {
        this.trackCache.delete(oldestKey);
        this.cacheTimestamps.delete(oldestKey);
        this.nullPreviewIds.delete(oldestKey);
      }
    }
    this.trackCache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
    if (value.previewUrl === null) {
      this.nullPreviewIds.add(key);
    }
  }

  private getCachedTrack(trackId: string): SpotifyTrackSummary | undefined {
    if (this.isCacheValid(trackId)) {
      return this.trackCache.get(trackId);
    }
    // Expired — evict
    this.trackCache.delete(trackId);
    this.cacheTimestamps.delete(trackId);
    this.nullPreviewIds.delete(trackId);
    return undefined;
  }

  /** Returns true if we already know this track has no preview URL. */
  isKnownNoPreview(trackId: string): boolean {
    return this.nullPreviewIds.has(trackId);
  }

  /** Returns cache diagnostics for the playback diagnostic panel. */
  getCacheStats(): { cachedTracks: number; nullPreviewTracks: number } {
    return {
      cachedTracks: this.trackCache.size,
      nullPreviewTracks: this.nullPreviewIds.size,
    };
  }

  /** Clears all cached track data. Useful after sync operations or manual refresh. */
  clearCache(): void {
    this.trackCache.clear();
    this.cacheTimestamps.clear();
    this.nullPreviewIds.clear();
  }

  private async waitForCooldown(): Promise<void> {
    const now = Date.now();
    if (now < SpotifyService.cooldownUntil) {
      await new Promise((r) => setTimeout(r, SpotifyService.cooldownUntil - now));
    }
  }

  private setCooldown(seconds: number): void {
    SpotifyService.cooldownUntil = Date.now() + seconds * 1000;
  }

  private async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflightRequests.get(key);
    if (existing) return existing as Promise<T>;

    const promise = fn();
    this.inflightRequests.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflightRequests.delete(key);
    }
  }

  private async directSpotifyGet<T>(path: string, params?: Record<string, string | number>, retries = 2): Promise<T> {
    const url = new URL(`${SpotifyService.SPOTIFY_API}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    }
    const key = `direct:${url.pathname}${url.search}`;

    return this.dedupe<T>(key, async () => {
      const token = spotifyAuthService.getStoredAccessToken();
      if (!token) throw new Error('No Spotify access token');

      await this.waitForCooldown();

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 429) {
        const waitSec = parseInt(res.headers.get('retry-after') || '5', 10);
        this.setCooldown(waitSec);
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, waitSec * 1000));
          return this.directSpotifyGet(path, params, retries - 1);
        }
        throw new Error(`Spotify API rate limited (429), retry after ${waitSec}s`);
      }

      if (!res.ok) {
        throw new Error(`Spotify API ${res.status}: ${await res.text()}`);
      }

      return res.json();
    });
  }

  private mapRawTrackToSummary(track: SpotifyTrack): SpotifyTrackSummary {
    return {
      id: track.id,
      name: track.name,
      artistName: track.artists?.[0]?.name ?? 'Unknown Artist',
      albumName: track.album?.name ?? null,
      imageUrl: track.album?.images?.[0]?.url ?? null,
      previewUrl: track.preview_url ?? null,
      spotifyUri: `spotify:track:${track.id}`,
      durationMs: track.duration_ms ?? 0,
      externalUrl: track.external_urls?.spotify ?? null,
    };
  }

  private async spotifyGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    await this.waitForCooldown();

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      query.set(key, String(value));
    });
    const qs = query.toString();
    const fullPath = `${path}${qs ? `?${qs}` : ''}`;

    return this.dedupe<T>(`spotifyGet:${fullPath}`, async () => {
      try {
        return await apiRequest<T>(fullPath);
      } catch (err: any) {
        if (err?.status === 429) {
          this.setCooldown(10);
        }
        throw err;
      }
    });
  }

  /**
   * Search for an artist by name
   */
  async searchArtist(name: string, limit: number = 10): Promise<SpotifyArtist[]> {
    try {
      const response = await this.spotifyGet<SpotifySearchResponse>('/spotify/search', {
        q: name,
        type: 'artist',
        limit
      });
      
      
      return response.artists?.items || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get artist details by ID
   */
  async getArtist(artistId: string): Promise<SpotifyArtist> {
    try {
      const response = await this.spotifyGet<SpotifySearchResponse>('/spotify/search', {
        q: `id:${artistId}`,
        type: 'artist',
        limit: 1
      });

      
      const artist = response.artists?.items?.[0];
      if (!artist) {
        throw new Error('Artist not found on Spotify');
      }

      return artist;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(artistId: string, limit: number = 50): Promise<SpotifyAlbum[]> {
    void artistId;
    void limit;
    return [];
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(albumId: string, limit: number = 50): Promise<SpotifyTrack[]> {
    void albumId;
    void limit;
    return [];
  }

  /**
   * Get track details by ID — with local cache.
   * Caches both positive results (track found) and negative results (null preview).
   * Returns cached data immediately when available, avoiding redundant API calls.
   */
  async getTrack(trackId: string): Promise<SpotifyTrackSummary> {
    const cached = this.getCachedTrack(trackId);
    if (cached) return cached;

    let track: SpotifyTrackSummary;
    try {
      track = await this.spotifyGet<SpotifyTrackSummary>(`/spotify/track/${encodeURIComponent(trackId)}`);
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 'RATE_LIMITED') throw err;
      const raw = await this.directSpotifyGet<SpotifyTrack>(`/tracks/${encodeURIComponent(trackId)}`);
      track = this.mapRawTrackToSummary(raw);
    }

    this.setCache(trackId, track);
    return track;
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 10): Promise<SpotifyTrack[]> {
    try {
      const response = await this.spotifyGet<SpotifySearchResponse>('/spotify/search', {
        q: query,
        type: 'track',
        limit
      });
      return response.tracks?.items || [];
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 'RATE_LIMITED') throw err;
      const response = await this.directSpotifyGet<SpotifySearchResponse>('/search', {
        q: query,
        type: 'track',
        limit,
      });
      return response.tracks?.items || [];
    }
  }

  /**
   * Search for tracks by artist and title
   */
  async searchTrackByArtistAndTitle(artist: string, title: string): Promise<SpotifyTrack[]> {
    const query = `artist:${artist} track:${title}`;
    return this.searchTracks(query, 10);
  }

  private async getBestTrackSummary(
    trackIds: string[],
    requirePreview: boolean,
    lookupBudget?: { remaining: { value: number } }
  ): Promise<SpotifyTrackSummary | null> {
    let firstResolved: SpotifyTrackSummary | null = null;

    for (const trackId of trackIds) {
      if (!trackId) {
        continue;
      }

      // Respect the global lookup budget
      if (lookupBudget && lookupBudget.remaining.value <= 0) {
        break;
      }

      // When requiring a preview, skip tracks we already know have no preview
      if (requirePreview && this.isKnownNoPreview(trackId)) {
        continue;
      }

      try {
        if (lookupBudget) lookupBudget.remaining.value--;
        const track = await this.getTrack(trackId);
        if (!firstResolved) {
          firstResolved = track;
        }

        if (track.previewUrl) {
          return track;
        }

        // When we don't need a preview, the first successfully resolved track is good enough.
        if (!requirePreview && firstResolved) {
          return firstResolved;
        }
      } catch {
        // Ignore individual track lookup failures and continue.
      }
    }

    return requirePreview ? null : firstResolved;
  }

  async searchBestTrackSummary(
    artist: string,
    title: string,
    options?: { requirePreview?: boolean }
  ): Promise<SpotifyTrackSummary | null> {
    const requirePreview = options?.requirePreview ?? false;

    // Hard cap on total getTrack() calls across all queries to stay within
    // Spotify API limits and avoid excessive billing on the proxy.
    const MAX_TRACK_LOOKUPS = 10;
    const lookupBudget = { remaining: { value: MAX_TRACK_LOOKUPS } };

    const queries = [
      `artist:${artist} track:${title}`,
      `${artist} ${title}`,
      title
    ];

    for (const query of queries) {
      if (lookupBudget.remaining.value <= 0) break;

      const tracks = await this.searchTracks(query, 10);
      const candidateIds = tracks
        .map((track) => track.id)
        .filter((id): id is string => Boolean(id));

      if (candidateIds.length === 0) {
        continue;
      }

      const best = await this.getBestTrackSummary(candidateIds, requirePreview, lookupBudget);
      if (best) {
        return best;
      }

      // When we don't require a preview, getBestTrackSummary would have returned
      // the first resolved track. If it returned null, all lookups failed —
      // try the next query. But if it returned a track, we already exited above.
    }

    return null;
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();

// Export types for use in other files
export type { SpotifyArtist, SpotifyAlbum, SpotifyTrack };

