// Spotify OAuth 2.0 Authentication Service
// Handles user authentication with Spotify

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface SpotifyAuthResult extends SpotifyTokenResponse {
  stateData?: Record<string, any>;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  country: string;
  product?: string;
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
    this.redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin;
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
   * Generate the authorization URL for Spotify OAuth with PKCE.
   * Optionally encodes stateData (e.g. { action: 'link' }) into the OAuth state parameter
   * so it survives the redirect and can be read back after callback.
   */
  async getAuthorizationUrl(stateData?: Record<string, any>): Promise<{ url: string; codeVerifier: string }> {
    this.assertConfigured();

    const scopes = [
      'user-read-email',
      'user-read-private',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
    ].join(' ');

    const { codeVerifier, codeChallenge } = await this.generatePKCE();
    const nonce = this.generateRandomString(32);

    // Encode stateData into the state parameter so it round-trips through the OAuth redirect
    const state = stateData
      ? btoa(JSON.stringify({ n: nonce, ...stateData }))
      : nonce;

    // Store code verifier and nonce for later verification
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    sessionStorage.setItem('spotify_oauth_state', nonce);

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
   * Exchange authorization code for access token using PKCE.
   * Decodes the state parameter to recover any stateData passed through the OAuth redirect.
   */
  async exchangeCodeForToken(code: string, stateFromCallback?: string | null): Promise<SpotifyAuthResult> {
    try {
      this.assertConfigured();

      const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please try again.');
      }

      // Decode the state parameter to recover the nonce and any embedded stateData
      const storedNonce = sessionStorage.getItem('spotify_oauth_state');
      let verifiedNonce: string | null = null;
      let stateData: Record<string, any> | undefined;

      if (stateFromCallback) {
        try {
          const decoded = JSON.parse(atob(stateFromCallback));
          if (decoded && typeof decoded === 'object' && typeof decoded.n === 'string' && decoded.n.length > 0) {
            verifiedNonce = decoded.n;
            const { n, ...rest } = decoded;
            if (Object.keys(rest).length > 0) {
              stateData = rest;
            }
          } else {
            // Invalid state structure — treat as plain nonce for backward compat
            verifiedNonce = stateFromCallback;
          }
        } catch {
          // Not a JSON-encoded state — treat as plain nonce (backward compatible)
          verifiedNonce = stateFromCallback;
        }
      }

      if (!storedNonce || !verifiedNonce || storedNonce !== verifiedNonce) {
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

      const tokenResponse: SpotifyTokenResponse = await response.json();
      return { ...tokenResponse, stateData };
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    } finally {
      sessionStorage.removeItem('spotify_code_verifier');
      sessionStorage.removeItem('spotify_oauth_state');
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
   * Checks for scope downgrade — if Spotify returns fewer scopes than requested,
   * the user must re-authorize.
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

      const data: SpotifyTokenResponse = await response.json();

      const requiredScopes = [
        'user-read-email', 'user-read-private', 'streaming',
        'user-read-playback-state', 'user-modify-playback-state',
        'user-read-currently-playing',
      ];

      const grantedScopes = (data.scope || '').split(' ');
      const missingScopes = requiredScopes.filter(s => !grantedScopes.includes(s));

      if (missingScopes.length > 0) {
        console.warn('Spotify token refresh resulted in reduced scopes:', missingScopes);
        throw new Error('Spotify permissions were reduced. Please sign in again.');
      }

      return data;
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

  /**
   * Refresh the Spotify access token and fetch the user's product (subscription tier) status.
   * Returns the new access token and the Spotify product string (e.g. "premium", "free", "open").
   * Useful for keeping the backend in sync with the user's current Premium status.
   */
  async refreshAndFetchProduct(): Promise<{ accessToken: string; product: string | null }> {
    const storedRefresh = this.getStoredRefreshToken();
    if (!storedRefresh) {
      throw new Error('No Spotify refresh token available');
    }

    const tokenResponse = await this.refreshAccessToken(storedRefresh);
    this.storeTokens(tokenResponse);

    let product: string | null = null;
    try {
      const profile = await this.getUserProfile(tokenResponse.access_token);
      product = profile.product ?? null;
    } catch {
      // Non-fatal: product status will be re-checked on next login
    }

    return { accessToken: tokenResponse.access_token, product };
  }
}

export const spotifyAuthService = new SpotifyAuthService();
export type { SpotifyUserProfile, SpotifyTokenResponse, SpotifyAuthResult };

