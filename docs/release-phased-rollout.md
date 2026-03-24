# Phased Rollout and Rollback Playbook

## Milestone Sequence

1. **Milestone 1 - Backend Stability**
   - Enable `VITE_FLAG_USE_SPOTIFY_PROXY=true`.
   - Deploy functions and verify search endpoints.
2. **Milestone 2 - UX/Mobile Quality**
   - Deploy homepage slider/fallback changes and no-result simplification.
3. **Milestone 3 - Engagement Loop**
   - Enable request feedback modal and completion notifications.
4. **Milestone 4 - Hardening**
   - Final QA pass, rules validation, and performance verification.

## Feature Flags

- `VITE_FLAG_USE_SPOTIFY_PROXY`
- `VITE_FLAG_REQUEST_FEEDBACK_MODAL`
- `VITE_FLAG_REQUEST_COMPLETION_NOTIFICATIONS`

## Acceptance Criteria by Milestone

- M1: No client-side Spotify secret usage; >=95% successful Spotify proxy responses in smoke checks.
- M2: No image holes on homepage; single search box in no-result flow; no share overlap on target devices.
- M3: Request submission shows SLA feedback; completion creates in-app notification for requester.
- M4: Security/rules checks and device matrix complete.

## Rollback

- Disable affected flag(s) and redeploy web app.
- Revert to previous hosting release if regression impacts user-critical path.
- For backend incidents, disable function usage flag and redeploy frontend immediately.

## Post-Release Monitoring

- Watch telemetry events:
  - `spotify_search_success`
  - `spotify_search_error`
  - `search_no_result_view`
  - `search_request_submitted`
  - `request_notification_received`
- Monitor Firestore notifications growth and request status transitions.
