# Environment Variables Setup Guide

## Overview

This project uses environment variables for API keys and configuration. The setup differs between local development and production.

## File Structure

- **`.env.local`** - Local development (git-ignored, never committed)
- **`.env.production`** - Production build (committed to git)
- **`.env.example`** - Template file (committed to git)

## Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

## Production Deployment

The `.env.production` file is committed to git and contains the production API keys. When you run `npm run build`, Vite automatically loads environment variables from `.env.production` for production builds.

### How It Works

1. **Build Time**: Vite reads `.env.production` and embeds the API key into the JavaScript bundle
2. **Runtime**: The API key is available as `process.env.API_KEY` or `process.env.GEMINI_API_KEY`
3. **Deployment**: The built bundle (with embedded API key) is deployed to Firebase Hosting

### Important Notes

⚠️ **Security Warning**: Since API calls are made client-side, the API key will be visible in the browser's JavaScript bundle. This is a trade-off for client-side functionality.

For better security, consider:
- Using Firebase Functions for server-side API calls
- Implementing API key restrictions in Google Cloud Console
- Using domain restrictions for the API key

## Environment Variables

### Required

- `GEMINI_API_KEY` - Google Gemini API key for AI translations

### Optional

- `GENIUS_ACCESS_TOKEN` - Genius API for lyric imports
- `LYRICFIND_API_KEY` - LyricFind API key
- `LYRICFIND_USERNAME` - LyricFind username
- `LASTFM_API_KEY` - Last.fm API key

## Troubleshooting

### API calls not working in production

1. Check that `.env.production` exists and contains the API key
2. Verify the build includes the key: `npm run build` should complete without errors
3. Check browser console for API key errors
4. Ensure the API key is valid and has proper permissions

### Local development not working

1. Ensure `.env.local` exists (not just `.env.example`)
2. Restart the dev server after creating/modifying `.env.local`
3. Check that the API key is correctly formatted (no quotes, no spaces)

## Updating API Keys

### For Local Development
Edit `.env.local` and restart the dev server.

### For Production
1. Edit `.env.production`
2. Commit and push to git
3. Rebuild and redeploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

