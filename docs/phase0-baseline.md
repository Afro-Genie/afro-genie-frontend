# Phase 0 Baseline and Repro Harness

This document defines baseline metrics, reproducible bug scripts, and feature-flag rollout controls for the backend-first implementation.

## 1) Baseline KPIs

- Spotify search success rate: `% of successful search responses / total search attempts`
- No-result to request conversion: `% of no-result views that submit request`
- Request completion notification delivery rate: `% completed requests that emit in-app notification`
- Mobile rendering defect count: tracked defects for iOS/Android viewport issues
- Role integrity incidents: count of unintended role changes (admin escalation defects)

## 2) Reproduction Scripts

### Spotify search reliability
1. Open search page with query containing artist + title.
2. Verify in-app result rendering (no external redirect).
3. Validate query variants: exact, typo, partial, artist-only.
4. Record response/error ratio across 20 test queries.

### Lyrics accuracy mismatch
1. Select song with known lyric source.
2. Compare stored original/translations with rendered output.
3. Validate line break consistency and encoding.
4. Record mismatches and classify cause (data vs render).

### Mobile cultural context formatting
1. Open song page on iPhone SE and Android small viewport.
2. Verify CC text for broken markdown artifacts (`*`, `#`, list symbols).
3. Validate line wrapping and overflow.

### Search no-result UX
1. Run query with no expected results.
2. Verify single search input visible.
3. Submit request and validate confirmation flow.

### Share button interference
1. Open long lyric page on iOS + Android.
2. Verify share control does not overlap key reading/UI controls.

### Role assignment bug
1. Sign in as normal user.
2. Reload app and verify role remains unchanged.
3. Verify only admin action can modify role in admin panel.

## 3) Rollout Flag Strategy

Flags are controlled via Vite env variables:

- `VITE_FLAG_USE_SPOTIFY_PROXY=true|false`
- `VITE_FLAG_REQUEST_FEEDBACK_MODAL=true|false`
- `VITE_FLAG_REQUEST_COMPLETION_NOTIFICATIONS=true|false`
- `VITE_SPOTIFY_PROXY_BASE_URL=<functions-base-url>`

## 4) Acceptance Gate for Phase 0 Complete

- Baseline KPI collection approach documented
- Repro scripts documented and executable
- Feature flags configured in app code
