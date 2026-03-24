# Phase 4 Hardening and QA

## Integration/API Checks

- Validate `spotifySearch`, `spotifyArtistDetails`, `spotifyTrackDetails`, `spotifyArtistAlbums`, `spotifyAlbumTracks` function responses.
- Verify rate limits return `429` after threshold and recover after window reset.
- Confirm secrets are loaded from Firebase Functions secret manager.

## UI Regression Checks

- Breakpoints: iPhone SE, iPhone 14, Pixel small, Pixel large, tablet, desktop.
- Journeys:
  - Search hit/no-result flow.
  - Song detail with cultural context and fixed action controls.
  - Request submission with confirmation feedback.
  - Request completion in-app notification delivery.

## Security Checks

- Firestore rules:
  - Notifications only readable by owner.
  - User roles only mutable by admins.
  - No privileged write path from auth-side auto role assignment.
- Ensure no Spotify client secret in frontend env or source.

## Reliability Controls

- Spotify token caching in function runtime.
- Client-side search telemetry events for success/error/no-result/request conversion.
- Status timeline persisted on request create/update.

## Exit Criteria

- Critical journey smoke tests pass across target devices.
- No P0/P1 auth, role, or notification permission defects.
- Search reliability and request notification KPIs are measurable in logs.
