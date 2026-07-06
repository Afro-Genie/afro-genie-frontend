<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1lC7qWm_ZN2SOWFwWAOV_x5gTPC7rNuhb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Firebase Functions (Spotify Proxy + Notifications)

This app now uses Firebase Cloud Functions for Spotify API proxying and request completion notifications.

1. Install function dependencies:
   `cd functions && npm install`
2. Set Firebase function secrets:
   - `firebase functions:secrets:set SPOTIFY_CLIENT_ID`
   - `firebase functions:secrets:set SPOTIFY_CLIENT_SECRET`
3. Deploy functions:
   `firebase deploy --only functions`

### Frontend feature flags

Set these in `.env.local`:

- `VITE_FLAG_USE_SPOTIFY_PROXY=true`
- `VITE_FLAG_REQUEST_FEEDBACK_MODAL=true`
- `VITE_FLAG_REQUEST_COMPLETION_NOTIFICATIONS=true`
- `VITE_SPOTIFY_PROXY_BASE_URL=https://us-central1-afrogenie.cloudfunctions.net`

## Frontend -> Backend Link (Env)

Set `VITE_API_URL` to your backend base path including `/api`.

- Staging example: `https://afro-genie-backend-staging-production.up.railway.app/api`
- Production example: `https://afro-genie-backend-production.up.railway.app/api`

Automated commands:

- `npm run env:set:api:staging`
- `npm run env:set:api:production`
- `npm run env:set:api -- staging https://your-custom-backend-domain/api`

These commands update `.env`, `.env.production`, and `.env.example`.
