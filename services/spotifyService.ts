// Spotify API Service
// Note: This service requires Spotify API credentials (Client ID and Client Secret)
// Set these in your .env.local file as:
// VITE_SPOTIFY_CLIENT_ID=your_client_id
// VITE_SPOTIFY_CLIENT_SECRET=your_client_secret

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

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
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly BASE_URL = 'https://api.spotify.com/v1';

  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Spotify API credentials not found. Please set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET in your .env.local file');
    }
  }

  /**
   * Authenticate with Spotify using Client Credentials flow
   * This is for server-side or app-only authentication
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify API credentials not configured. Please set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET in your .env.local file');
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Spotify authentication failed: ${error}`);
      }

      const data: SpotifyTokenResponse = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
      
      return this.accessToken;
    } catch (error) {
      console.error('Error authenticating with Spotify:', error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to Spotify API
   */
  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const token = await this.authenticate();
    
    let url = `${this.BASE_URL}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Spotify API error: ${error}`);
    }

    return response.json();
  }

  /**
   * Search for an artist by name
   */
  async searchArtist(name: string, limit: number = 20): Promise<SpotifyArtist[]> {
    try {
      const response = await this.makeRequest<SpotifySearchResponse>('/search', {
        q: name,
        type: 'artist',
        limit: limit.toString()
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
      return await this.makeRequest<SpotifyArtist>(`/artists/${artistId}`);
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
      const response = await this.makeRequest<{ items: SpotifyAlbum[] }>(`/artists/${artistId}/albums`, {
        limit: limit.toString(),
        include_groups: 'album,single,compilation'
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
      const response = await this.makeRequest<{ items: Array<{ track?: SpotifyTrack }> }>(`/albums/${albumId}/tracks`, {
        limit: limit.toString()
      });
      
      return response.items
        .map(item => item.track)
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
      return await this.makeRequest<SpotifyTrack>(`/tracks/${trackId}`);
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
      const response = await this.makeRequest<SpotifySearchResponse>('/search', {
        q: query,
        type: 'track',
        limit: limit.toString()
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

