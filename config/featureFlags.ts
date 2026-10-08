type FlagValue = 'true' | 'false' | undefined;

const asBoolean = (value: FlagValue, fallback: boolean): boolean => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

/**
 * First "true"/"false" value wins; otherwise undefined. Used to migrate an env
 * var to a new name while keeping the old one working for already-configured
 * environments.
 */
const firstDefined = (...values: FlagValue[]): FlagValue => {
  for (const value of values) {
    if (value === 'true' || value === 'false') return value;
  }
  return undefined;
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

  // Translation diagnostics panel (hidden by default, enable via VITE_FLAG_TRANSLATION_DIAGNOSTICS=true)
  translationDiagnostics: asBoolean(import.meta.env.VITE_FLAG_TRANSLATION_DIAGNOSTICS as FlagValue, false),

  // --- Token economy (Phase 1) flags ---

  // Token history + balance (backend live in Phase 1)
  tokensPage: asBoolean(import.meta.env.VITE_FLAG_TOKENS_PAGE as FlagValue, true),

  // Leaderboard (backend live in Phase 1)
  leaderboardPage: asBoolean(import.meta.env.VITE_FLAG_LEADERBOARD_PAGE as FlagValue, true),

  // Store / referrals / seasonal snapshots (Phase 3 — backend live in R1)
  storePage: asBoolean(import.meta.env.VITE_FLAG_STORE_PAGE as FlagValue, true),
  referralsPage: asBoolean(import.meta.env.VITE_FLAG_REFERRALS_PAGE as FlagValue, true),
  leaderboardSeasons: asBoolean(import.meta.env.VITE_FLAG_LEADERBOARD_SEASONS as FlagValue, true),

  // --- GT payments & store upgrade (Phase 2) flags ---

  // Buy GT page (Paystack top-ups + premium passes)
  buyGtPage: asBoolean(import.meta.env.VITE_FLAG_BUY_GT_PAGE as FlagValue, true),

  // --- Playback redesign (Phase 3) flags ---

  // 3-tier playback fallback (own audio → YouTube → Spotify preview), no Premium
  // required. Phase 4 rollout flag: DEFAULT OFF — the legacy Spotify player
  // (SDK/preview) stays active until the YouTube tier is validated per
  // environment (staging → production → 100%). Enable via
  // `VITE_FLAG_PLAYBACK_YOUTUBE=true`; `VITE_FLAG_YOUTUBE_PLAYBACK` is kept as
  // a deprecated alias for environments that already set it.
  youtubePlayback: asBoolean(
    firstDefined(
      import.meta.env.VITE_FLAG_PLAYBACK_YOUTUBE as FlagValue,
      import.meta.env.VITE_FLAG_YOUTUBE_PLAYBACK as FlagValue,
    ),
    false,
  ),
};
