type FlagValue = 'true' | 'false' | undefined;

const asBoolean = (value: FlagValue, fallback: boolean): boolean => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

/**
 * Centralized runtime feature flags.
 * Defaults are conservative and can be overridden by Vite env vars.
 */
export const featureFlags = {
  // Phase 1: backend-first Spotify/search migration
  useSpotifyProxy: asBoolean(import.meta.env.VITE_FLAG_USE_SPOTIFY_PROXY as FlagValue, true),
  // Phase 3: request confirmation modal and contributor copy
  requestFeedbackModal: asBoolean(import.meta.env.VITE_FLAG_REQUEST_FEEDBACK_MODAL as FlagValue, true),
  // Phase 3: in-app notification polling/listening
  requestCompletionNotifications: asBoolean(import.meta.env.VITE_FLAG_REQUEST_COMPLETION_NOTIFICATIONS as FlagValue, true),
};

export const spotifyProxyBaseUrl =
  import.meta.env.VITE_SPOTIFY_PROXY_BASE_URL ||
  `http://localhost:3001/api`;
