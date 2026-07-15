/**
 * Spotify Auth Debug Utility
 *
 * Usage from browser console:
 *   import { spotifyDebug } from './lib/spotifyDebug';
 *   spotifyDebug.inspect();
 *   spotifyDebug.validateRedirectUri();
 */

import { spotifyAuthService } from '../services/spotifyAuthService';

export const spotifyDebug = {
  /**
   * Print the current Spotify OAuth configuration to the console.
   */
  inspect() {
    const redirectUri = spotifyAuthService.getRedirectUri();
    const clientId = spotifyAuthService.getClientId();
    const hasTokens = !!spotifyAuthService.getStoredAccessToken();
    const hasRefresh = !!spotifyAuthService.getStoredRefreshToken();
    const tokenExpired = spotifyAuthService.isTokenExpired();

    console.group('[Spotify Debug] OAuth Configuration');
    console.log('Client ID:', clientId ? `${clientId.slice(0, 6)}...` : 'NOT SET');
    console.log('Redirect URI:', redirectUri || 'NOT SET');
    console.log('Current origin:', window.location.origin);
    console.log('Has access token:', hasTokens);
    console.log('Has refresh token:', hasRefresh);
    console.log('Token expired:', tokenExpired);
    console.groupEnd();

    console.log('\n[Spotify Debug] Checklist:');
    console.log('1. Go to https://developer.spotify.com/dashboard');
    console.log('2. Select your app → Settings → Redirect URIs');
    console.log('3. Add this EXACT URI:', redirectUri);
    console.log('4. Save changes');
    console.log('5. Note: http://localhost is NO LONGER supported (removed Nov 2025)');
    console.log('   Use http://127.0.0.1 instead for local development.');

    return {
      clientId: clientId ? `${clientId.slice(0, 6)}...` : null,
      redirectUri,
      origin: window.location.origin,
      hasTokens,
      hasRefresh,
      tokenExpired,
    };
  },

  /**
   * Build the full authorization URL for testing.
   * Opens it in a new tab so you can inspect the request.
   */
  async testAuthUrl() {
    const sanitizeLog = (val: string) => String(val).replace(/\r|\n/g, ' ');
    const { url } = await spotifyAuthService.getAuthorizationUrl({ action: 'debug' });
    console.log('[Spotify Debug] Authorization URL:', sanitizeLog(url));
    console.log('[Spotify Debug] Redirect URI in URL:', sanitizeLog(new URL(url).searchParams.get('redirect_uri') ?? ''));
    return url;
  },

  /**
   * Validate that the redirect URI matches what Spotify expects.
   */
  validateRedirectUri() {
    const redirectUri = spotifyAuthService.getRedirectUri();
    const issues: string[] = [];

    if (!redirectUri) {
      issues.push('Redirect URI is empty. Set VITE_SPOTIFY_REDIRECT_URI in your .env');
    }

    if (redirectUri?.includes('localhost')) {
      issues.push('CRITICAL: http://localhost is no longer supported by Spotify (removed Nov 2025). Use http://127.0.0.1 instead.');
    }

    if (redirectUri?.startsWith('http://') && !redirectUri.includes('127.0.0.1')) {
      issues.push('WARNING: HTTP redirect URIs are only allowed for 127.0.0.1 loopback. Use HTTPS for production.');
    }

    if (!redirectUri?.startsWith('http://') && !redirectUri?.startsWith('https://')) {
      issues.push('Redirect URI must start with http:// or https://');
    }

    if (issues.length === 0) {
      console.log('[Spotify Debug] Redirect URI looks valid:', redirectUri);
    } else {
      console.error('[Spotify Debug] Issues found:');
      issues.forEach((issue) => console.error('  -', issue));
    }

    return { valid: issues.length === 0, issues, redirectUri };
  },

  /**
   * Test the backend diagnostic endpoint.
   */
  async checkBackend() {
    try {
      const res = await fetch('/api/auth/spotify/debug');
      const data = await res.json();
      console.log('[Spotify Debug] Backend config:', data);
      return data;
    } catch (err) {
      console.error('[Spotify Debug] Failed to reach backend:', err);
      return null;
    }
  },
};
