# Spotify API Setup Guide

This guide will help you set up Spotify API credentials for the Afro Genie platform.

## Prerequisites

1. A Spotify account
2. Access to the Spotify Developer Dashboard

## Steps to Get Spotify API Credentials

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Create a New App**
   - Click "Create an app"
   - Fill in:
     - App name: "Afro Genie" (or your preferred name)
     - App description: "Music metadata integration for Afro Genie"
     - Website: Enter your website URL (e.g., `https://afrogenie.web.app` or `https://afro-genie.com`)
     - Redirect URIs: **IMPORTANT for OAuth login**
       - For local development: `http://localhost:3000` (or your dev port)
       - For production: `https://yourdomain.com` (your actual domain)
       - Add both if needed: `http://localhost:3000`, `https://yourdomain.com`
       - Note: The redirect URI must exactly match the URL where your app is hosted
   - Select which API/SDKs you plan to use:
     - Check "Web API" (required for our integration)
     - Other options are optional
   - Check "I understand and agree with Spotify's Developer Terms of Service and Design Guidelines"
   - Click "Save"

3. **Get Your Credentials**
   - After creating the app, you'll see:
     - **Client ID**: Copy this value (required for OAuth login)
     - **Client Secret**: Click "Show client secret" and copy this value (optional - only needed for server-side operations)

4. **Configure Environment Variables**
   - Create or edit `.env.local` in your project root
   - Add the following:
     ```
     VITE_SPOTIFY_CLIENT_ID=your_client_id_here
     VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
     ```
   - Replace `your_client_id_here` with your actual Client ID
   - `VITE_SPOTIFY_CLIENT_SECRET` is optional - only needed if you use server-side Spotify API calls
   - **Note**: For OAuth login, only `VITE_SPOTIFY_CLIENT_ID` is required (we use PKCE flow which doesn't need client secret)

5. **Restart Your Development Server**
   - Stop your current dev server (if running)
   - Start it again: `npm run dev`

## Usage

Once configured, you can:
- **User Authentication**: Users can sign in with their Spotify account using OAuth 2.0
- Access the Spotify Integration page from the Admin Panel
- Search for artists and tracks
- Import metadata (artist names, album covers, release dates, etc.)
- Batch import albums and tracks

## Spotify OAuth Login

The app now supports Spotify OAuth 2.0 authentication:
- Users can sign in with their Spotify account
- Uses PKCE (Proof Key for Code Exchange) for secure authentication
- No client secret required in the browser (secure)
- Automatically retrieves user profile (email, display name, profile image, country)
- Stores Spotify access and refresh tokens for future API calls

## Important Notes

- **Lyrics are NOT imported from Spotify** - Lyrics must still be uploaded manually
- The Spotify integration is for metadata only (artist data, song titles, album info, images)
- API credentials are stored in environment variables and should never be committed to version control
- **OAuth Login**: Uses PKCE flow (no client secret needed in browser - secure)
- **Redirect URI**: Must exactly match your app's URL (e.g., `http://localhost:3000` for dev, `https://yourdomain.com` for production)
- The service uses both:
  - **PKCE OAuth flow** for user authentication (browser-based, secure)
  - **Client Credentials flow** for server-side metadata operations (if using server-side API calls)

## Troubleshooting

If you encounter errors:
1. Verify your credentials are correct in `.env.local`
2. Make sure the file is named `.env.local` (not `.env`)
3. Restart your development server after adding credentials
4. Check the browser console for detailed error messages
5. Ensure your Spotify app is active in the Spotify Developer Dashboard

## Rate Limits

Spotify API has rate limits:
- Client Credentials flow: 10,000 requests per hour per app
- If you hit rate limits, wait before making more requests

## Support

For more information, visit:
- Spotify Web API Documentation: https://developer.spotify.com/documentation/web-api

