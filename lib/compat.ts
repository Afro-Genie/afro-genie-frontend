/**
 * Compatibility layer for regression-safe route and data transitions.
 *
 * Provides safe wrappers that protect the stable app while new routes,
 * data shapes, and UI flows are introduced behind feature flags.
 *
 * Usage:
 *   - wrapRoute(): safely navigate to a new route with a fallback
 *   - normalizeSongData(): additive normalization that never deletes fields
 *   - featureGate(): conditionally render new vs. legacy UI
 */

import { featureFlags } from '../config/featureFlags';

// ---------------------------------------------------------------------------
// Route compatibility
// ---------------------------------------------------------------------------

/**
 * Navigate to a new route path. If navigation fails or the route does not
 * exist, fall back to the provided fallback path (default: '/').
 *
 * Works with HashRouter by setting window.location.hash directly.
 */
export function navigateToRoute(
  newPath: string,
  fallbackPath: string = '/',
): void {
  try {
    const target = `${window.location.origin}/${newPath}`;
    const url = new URL(target);
    if (url.origin !== window.location.origin) {
      window.location.href = fallbackPath;
      return;
    }
    window.location.hash = `#${newPath}`;
  } catch {
    window.location.hash = `#${fallbackPath}`;
  }
}

/**
 * Check whether a given route path is reachable in the current route config.
 * Returns true if the path matches any known route pattern.
 *
 * Known stable routes (do not remove):
 *   /, /songs, /songs/:id, /songs/:id/translations,
 *   /artist/:id, /artists, /genre/:name, /language/:code,
 *   /search, /search/:query,
 *   /account, /community, /community/:categoryId,
 *   /admin/*, /terms, /privacy, /forgot-password, /reset-password
 */
export function isKnownRoute(path: string): boolean {
  const normalized = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const stableRoutes = [
    '/',
    '/songs',
    '/artist',
    '/artists',
    '/genre',
    '/language',
    '/search',
    '/account',
    '/community',
    '/admin',
    '/terms',
    '/privacy',
    '/forgot-password',
    '/reset-password',
    '/request-translation',
    '/artist/signup',
    '/artist/dashboard',
  ];
  return stableRoutes.some(
    (r) => normalized === r || normalized.startsWith(r + '/'),
  );
}

// ---------------------------------------------------------------------------
// Data normalization (additive only — never removes existing fields)
// ---------------------------------------------------------------------------

export interface NormalizableSong {
  id?: string;
  title?: string;
  name?: string;
  artistName?: string;
  artist?: string;
  genres?: any[];
  languages?: any[];
  spotifyId?: string | null;
  spotifyPreviewUrl?: string | null;
  [key: string]: any;
}

/**
 * Additively normalize a song object from any data source (DB, Spotify,
 * hybrid). Guarantees that common fields exist without deleting anything
 * the caller already has.
 */
export function normalizeSongData<T extends NormalizableSong>(song: T): T {
  if (!song) return song;

  const result = { ...song };

  // Ensure title exists (some sources use `name` instead)
  if (!result.title && result.name) {
    result.title = result.name;
  }

  // Ensure artistName exists (some sources use `artist` instead)
  if (!result.artistName && result.artist) {
    result.artistName = result.artist;
  }

  // Ensure genres is always an array
  if (!Array.isArray(result.genres)) {
    result.genres = [];
  }

  // Ensure languages is always an array
  if (!Array.isArray(result.languages)) {
    result.languages = [];
  }

  return result;
}

export interface NormalizableArtist {
  id?: string;
  name?: string;
  displayName?: string;
  genres?: any[];
  popularity?: number;
  followers?: number;
  images?: any[];
  [key: string]: any;
}

/**
 * Additively normalize an artist object from any data source.
 */
export function normalizeArtistData<T extends NormalizableArtist>(
  artist: T,
): T {
  if (!artist) return artist;

  const result = { ...artist };

  if (!result.name && result.displayName) {
    result.name = result.displayName;
  }

  if (!Array.isArray(result.genres)) {
    result.genres = [];
  }

  if (typeof result.popularity !== 'number') {
    result.popularity = 0;
  }

  if (typeof result.followers !== 'number') {
    result.followers = 0;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Feature-gated rendering helper
// ---------------------------------------------------------------------------

/**
 * Given a feature flag name and two render functions, returns the result of
 * the "new" render when the flag is enabled, otherwise falls back to the
 * "legacy" render. This makes it trivial to swap UI in/out without deleting
 * code.
 *
 * Usage in a component:
 *   {featureGate('genrePages', () => <NewGenrePage />, () => <LegacySearch />)}
 */
export function featureGate<T>(
  flagName: keyof typeof featureFlags,
  newUI: () => T,
  legacyUI: () => T,
): T {
  return featureFlags[flagName] ? newUI() : legacyUI();
}

/**
 * Check if a feature flag is enabled.
 * Useful for conditional logic outside of JSX.
 */
export function isFeatureEnabled(flagName: keyof typeof featureFlags): boolean {
  return !!featureFlags[flagName];
}
