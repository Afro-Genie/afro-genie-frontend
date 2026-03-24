import { featureFlags, spotifyProxyBaseUrl } from '../config/featureFlags';

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
  private async proxyGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!featureFlags.useSpotifyProxy) {
      throw new Error('Spotify proxy is disabled by feature flag');
    }

    const url = new URL(`${spotifyProxyBaseUrl}/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify proxy error (${response.status}): ${error}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Search for an artist by name
   */
  async searchArtist(name: string, limit: number = 20): Promise<SpotifyArtist[]> {
    try {
      const response = await this.proxyGet<SpotifySearchResponse>('spotifySearch', {
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
      return await this.proxyGet<SpotifyArtist>('spotifyArtistDetails', { artistId });
    } catch (error) {
      console.error('Error getting artist:', error);
      throw error;
    }
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(artistId: string, limit: number = 50): Promise<SpotifyAlbum[]> {
    try {
      const response = await this.proxyGet<{ items: SpotifyAlbum[] }>('spotifyArtistAlbums', {
        artistId,
        limit
      });
      
      return response.items || [];
    } catch (error) {
      console.error('Error getting artist albums:', error);
      throw error;
    }
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(albumId: string, limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      const response = await this.proxyGet<{ items: Array<SpotifyTrack> }>('spotifyAlbumTracks', {
        albumId,
        limit
      });
      
      return response.items
        .filter((track): track is SpotifyTrack => track !== undefined);
    } catch (error) {
      console.error('Error getting album tracks:', error);
      throw error;
    }
  }

  /**
   * Get track details by ID
   */
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    try {
      return await this.proxyGet<SpotifyTrack>('spotifyTrackDetails', { trackId });
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
      const response = await this.proxyGet<SpotifySearchResponse>('spotifySearch', {
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
}

// Export singleton instance
export const spotifyService = new SpotifyService();

// Export types for use in other files
export type { SpotifyArtist, SpotifyAlbum, SpotifyTrack };

