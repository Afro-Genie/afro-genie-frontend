type FlagValue = 'true' | 'false' | undefined;

const asBoolean = (value: FlagValue, fallback: boolean): boolean => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

/**
 * Centralized runtime feature flags.
 * Defaults are conservative and can be overridden by Vite env vars.
 *
 * Flags are grouped by phase to make it easy to toggle entire feature areas
 * during staged rollouts. Each flag corresponds to a specific phase in the
 * regression-safe implementation plan.
 */
export const featureFlags = {
  // Existing flags (preserved)
  // Phase 1 (original): backend-first Spotify/search migration
  useSpotifyProxy: asBoolean(import.meta.env.VITE_FLAG_USE_SPOTIFY_PROXY as FlagValue, true),
  // Phase 3 (original): request confirmation modal and contributor copy
  requestFeedbackModal: asBoolean(import.meta.env.VITE_FLAG_REQUEST_FEEDBACK_MODAL as FlagValue, true),
  // Phase 3 (original): in-app notification polling/listening
  requestCompletionNotifications: asBoolean(import.meta.env.VITE_FLAG_REQUEST_COMPLETION_NOTIFICATIONS as FlagValue, true),

  // --- Phase 0 isolation flags ---

  // Phase 2: dedicated genre result pages
  genrePages: asBoolean(import.meta.env.VITE_FLAG_GENRE_PAGES as FlagValue, true),

  // Phase 2: dedicated language result pages
  languagePages: asBoolean(import.meta.env.VITE_FLAG_LANGUAGE_PAGES as FlagValue, true),

  // Phase 3: artist popularity ranking across the app
  artistRanking: asBoolean(import.meta.env.VITE_FLAG_ARTIST_RANKING as FlagValue, true),

  // Phase 6: improved lyrics/translation inline UI
  inlineTranslationUX: asBoolean(import.meta.env.VITE_FLAG_INLINE_TRANSLATION_UX as FlagValue, false),

  // Phase 7: mobile/tablet playback action menu redesign
  playbackActionMenuRedesign: asBoolean(import.meta.env.VITE_FLAG_PLAYBACK_ACTION_MENU as FlagValue, false),

  // Phase 9: role request workflow in account settings
  roleApplicationWorkflow: asBoolean(import.meta.env.VITE_FLAG_ROLE_APPLICATION_WORKFLOW as FlagValue, false),

  // Playback diagnostics panel (hidden by default, enable via VITE_FLAG_PLAYBACK_DIAGNOSTICS=true)
  playbackDiagnostics: asBoolean(import.meta.env.VITE_FLAG_PLAYBACK_DIAGNOSTICS as FlagValue, false),
};

export const spotifyProxyBaseUrl =
  import.meta.env.VITE_SPOTIFY_PROXY_BASE_URL ||
  `http://localhost:3001/api`;
