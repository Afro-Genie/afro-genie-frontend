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
  async searchArtist(name: string, limit: number = 20): Promise<SpotifyArtist[]> {
    try {
      const response = await this.spotifyGet<SpotifySearchResponse>('/spotify/search', {
        q: name,
        type: 'artist',
        limit
      });
      
      return response.artists?.items || [];
    } catch (error) {
      console.error('Error searching for artist:', error);
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
      console.error('Error getting artist:', error);
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
      return await this.spotifyGet<SpotifyTrackSummary>(`/spotify/track/${encodeURIComponent(trackId)}`);
    } catch (error) {
      console.error('Error getting track:', error);
      throw error;
    }
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const response = await this.spotifyGet<SpotifySearchResponse>('/spotify/search', {
        q: query,
        type: 'track',
        limit
      });
      
      return response.tracks?.items || [];
    } catch (error) {
      console.error('Error searching for tracks:', error);
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

  async searchBestTrackSummary(artist: string, title: string): Promise<SpotifyTrackSummary | null> {
    const tracks = await this.searchTrackByArtistAndTitle(artist, title);
    const first = tracks[0];
    if (!first?.id) {
      return null;
    }

    return this.getTrack(first.id);
  }
}

// Export singleton instance
export const spotifyService = new SpotifyService();

// Export types for use in other files
export type { SpotifyArtist, SpotifyAlbum, SpotifyTrack };

