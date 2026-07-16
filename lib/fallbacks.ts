/**
 * Fallback utilities for graceful degradation when new endpoints or UI
 * states cannot be fully trusted during staged rollouts.
 *
 * These helpers ensure the stable app always has a recovery path, even
 * when new code paths fail.
 */

// ---------------------------------------------------------------------------
// Safe fetch with fallback
// ---------------------------------------------------------------------------

export interface FetchWithFallbackOptions<T> extends RequestInit {
  /** Fallback value returned when the fetch fails or the endpoint is unavailable. */
  fallback: T;
  /** Optional timeout in ms (default: 10000). */
  timeout?: number;
  /** If true, log errors to console (default: true). */
  logErrors?: boolean;
}

/**
 * Fetch a URL with a guaranteed fallback. If the request fails, times out,
 * or returns a non-ok status, the fallback value is returned instead.
 *
 * Usage:
 *   const songs = await fetchWithFallback('/api/new-songs', { fallback: [] });
 */
export async function fetchWithFallback<T>(
  url: string,
  options: FetchWithFallbackOptions<T>,
): Promise<T> {
  const { fallback, timeout = 10000, logErrors = true, ...fetchOptions } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (logErrors) {
        console.warn(
          `[fallback] Request to ${url} returned ${response.status}, using fallback`,
        );
      }
      return fallback;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (logErrors) {
      console.warn(
        `[fallback] Request to ${url} failed, using fallback:`,
        err instanceof Error ? err.message : err,
      );
    }
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Safe state initializer (avoids crashes from malformed stored data)
// ---------------------------------------------------------------------------

/**
 * Safely parse JSON from localStorage. Returns the fallback if parsing fails
 * or the key does not exist.
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely write JSON to localStorage. Swallows errors silently.
 */
export function safeLocalStorageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or unavailable — non-fatal
  }
}

// ---------------------------------------------------------------------------
// Stale data detection
// ---------------------------------------------------------------------------

/**
 * Check whether a cached timestamp is older than the given max age.
 * Useful for deciding whether to re-fetch data from the server.
 */
export function isStale(
  cachedTimestamp: number | string | Date | null | undefined,
  maxAgeMs: number,
): boolean {
  if (!cachedTimestamp) return true;
  const ts =
    typeof cachedTimestamp === 'string' || typeof cachedTimestamp === 'number'
      ? new Date(cachedTimestamp).getTime()
      : cachedTimestamp instanceof Date
        ? cachedTimestamp.getTime()
        : 0;
  return Date.now() - ts > maxAgeMs;
}

// ---------------------------------------------------------------------------
// Auth state recovery
// ---------------------------------------------------------------------------

/**
 * Clear all auth-related data from localStorage and sessionStorage.
 * Used for safe logout and stale session recovery.
 */
export function clearAllAuthData(): void {
  const authKeys = [
    'accessToken',
    'refreshToken',
    'spotify_access_token',
    'spotify_refresh_token',
    'spotify_token_expiry',
    'spotify_code_verifier',
    'spotify_oauth_state',
    'spotify_redirect_after_auth',
  ];

  for (const key of authKeys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Non-fatal
    }
  }
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export type RecoverableErrorKind =
  | 'network'
  | 'auth'
  | 'spotify_api'
  | 'rate_limit'
  | 'unknown';

/**
 * Classify an error into a recoverable category. Helps UI code decide
 * whether to show a retry button, redirect to login, etc.
 */
export function classifyError(error: unknown): RecoverableErrorKind {
  if (!(error instanceof Error)) return 'unknown';

  const msg = error.message.toLowerCase();

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('aborted')) {
    return 'network';
  }
  if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('session expired')) {
    return 'auth';
  }
  if (msg.includes('spotify') || msg.includes('premium')) {
    return 'spotify_api';
  }
  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'rate_limit';
  }

  return 'unknown';
}

/**
 * Returns a user-friendly message for a classified error.
 */
export function friendlyErrorMessage(kind: RecoverableErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Network error. Please check your connection and try again.';
    case 'auth':
      return 'Your session has expired. Please sign in again.';
    case 'spotify_api':
      return 'Spotify is temporarily unavailable. Please try again shortly.';
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
