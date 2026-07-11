import { apiRequest } from './api';

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
  private async spotifyGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      query.set(key, String(value));
    });
    const qs = query.toString();
    return apiRequest<T>(`${path}${qs ? `?${qs}` : ''}`);
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
   * Get track details by ID
   */
  async getTrack(trackId: string): Promise<SpotifyTrackSummary> {
    try {
      const track = await this.spotifyGet<SpotifyTrackSummary>(`/spotify/track/${encodeURIComponent(trackId)}`);
      return track;
    } catch (error) {
      throw error;
    }
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
    } catch (error) {
      throw error;
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
    requirePreview: boolean
  ): Promise<SpotifyTrackSummary | null> {
    let firstResolved: SpotifyTrackSummary | null = null;

    for (const trackId of trackIds) {
      if (!trackId) {
        continue;
      }

      try {
        const track = await this.getTrack(trackId);
        // console.log('[Spotify] getBestTrackSummary fetched track:', track);
        if (!firstResolved) {
          firstResolved = track;
        }

        if (track.previewUrl) {
          // console.log('[Spotify] getBestTrackSummary found preview, returning:', track);
          return track;
        }
      } catch {
        // Ignore individual track lookup failures and continue.
      }
    }

    // console.log('[Spotify] getBestTrackSummary no preview found, returning:', requirePreview ? null : firstResolved);
    return requirePreview ? null : firstResolved;
  }

  async searchBestTrackSummary(
    artist: string,
    title: string,
    options?: { requirePreview?: boolean }
  ): Promise<SpotifyTrackSummary | null> {
    const requirePreview = options?.requirePreview ?? false;
    const queries = [
      `artist:${artist} track:${title}`,
      `${artist} ${title}`,
      title
    ];

    // console.log('[Spotify] searchBestTrackSummary called with:', { artist, title, requirePreview });

    for (const query of queries) {
      // console.log('[Spotify] searchBestTrackSummary trying query:', query);
      const tracks = await this.searchTracks(query, 10);
      const candidateIds = tracks
        .map((track) => track.id)
        .filter((id): id is string => Boolean(id));

      // console.log('[Spotify] searchBestTrackSummary candidate IDs:', candidateIds);

      if (candidateIds.length === 0) {
        continue;
      }

      const best = await this.getBestTrackSummary(candidateIds, requirePreview);
      if (best) {
        // console.log('[Spotify] searchBestTrackSummary found best track:', best);
        return best;
      }
    }

    // console.log('[Spotify] searchBestTrackSummary no result found');
    if (!requirePreview) {
      return null;
    }

    return null;
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();

// Export types for use in other files
export type { SpotifyArtist, SpotifyAlbum, SpotifyTrack };

