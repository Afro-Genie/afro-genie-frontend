// Spotify OAuth 2.0 Authentication Service
// Handles user authentication with Spotify

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  country: string;
  images: Array<{ url: string }>;
  external_urls: { spotify: string };
}

class SpotifyAuthService {
  private clientId: string;
  private redirectUri: string;
  private readonly AUTH_URL = 'https://accounts.spotify.com/authorize';
  private readonly TOKEN_URL = 'https://accounts.spotify.com/api/token';
  private readonly API_BASE_URL = 'https://api.spotify.com/v1';

  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
    this.redirectUri = `${window.location.origin}${window.location.pathname}`;
  }

  /**
   * Ensure Spotify OAuth is configured before making auth requests.
   */
  private assertConfigured(): void {
    if (!this.clientId) {
      throw new Error('Spotify Client ID not found. Please set VITE_SPOTIFY_CLIENT_ID in your environment configuration.');
    }
  }

  /**
   * Generate a random string for PKCE
   */
  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Generate code verifier and challenge for PKCE
   */
  private async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate the authorization URL for Spotify OAuth with PKCE
   */
  async getAuthorizationUrl(): Promise<{ url: string; codeVerifier: string }> {
    this.assertConfigured();

    const scopes = [
      'user-read-email',
      'user-read-private'
    ].join(' ');

    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    const state = this.generateRandomString(32);
    
    // Store code verifier for later use
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    sessionStorage.setItem('spotify_oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'false'
    });

    return { url: `${this.AUTH_URL}?${params.toString()}`, codeVerifier };
  }

  /**
   * Exchange authorization code for access token using PKCE
   */
  async exchangeCodeForToken(code: string, stateFromCallback?: string | null): Promise<SpotifyTokenResponse> {
    try {
      this.assertConfigured();

      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please try again.');
      }

      const storedState = sessionStorage.getItem('spotify_oauth_state');
      if (!storedState || !stateFromCallback || storedState !== stateFromCallback) {
        throw new Error('Invalid Spotify OAuth state. Please try signing in again.');
      }

      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      // Clear code verifier after use
      sessionStorage.removeItem('spotify_code_verifier');
      sessionStorage.removeItem('spotify_oauth_state');

      return await response.json();
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Spotify API
   */
  async getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get user profile: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    try {
      this.assertConfigured();

      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Store tokens in localStorage
   */
  storeTokens(tokens: SpotifyTokenResponse): void {
    localStorage.setItem('spotify_access_token', tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem('spotify_refresh_token', tokens.refresh_token);
    }
    const expiryTime = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem('spotify_token_expiry', expiryTime.toString());
  }

  /**
   * Get stored access token
   */
  getStoredAccessToken(): string | null {
    return localStorage.getItem('spotify_access_token');
  }

  /**
   * Get stored refresh token
   */
  getStoredRefreshToken(): string | null {
    return localStorage.getItem('spotify_refresh_token');
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem('spotify_token_expiry');
    if (!expiryTime) return true;
    return Date.now() >= parseInt(expiryTime);
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
  }
}

export const spotifyAuthService = new SpotifyAuthService();
export type { SpotifyUserProfile, SpotifyTokenResponse };

