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
     - Redirect URIs: **For Client Credentials flow, you can use a placeholder URI**
       - Add: `http://localhost:3000/callback` (or any valid URL format)
       - Note: This won't actually be used since we're using Client Credentials flow, but Spotify requires at least one valid redirect URI format
       - Valid format examples: `http://localhost:3000/callback`, `https://yourdomain.com/callback`
   - Select which API/SDKs you plan to use:
     - Check "Web API" (required for our integration)
     - Other options are optional
   - Check "I understand and agree with Spotify's Developer Terms of Service and Design Guidelines"
   - Click "Save"

3. **Get Your Credentials**
   - After creating the app, you'll see:
     - **Client ID**: Copy this value
     - **Client Secret**: Click "Show client secret" and copy this value

4. **Configure Environment Variables**
   - Create or edit `.env.local` in your project root
   - Add the following:
     ```
     VITE_SPOTIFY_CLIENT_ID=your_client_id_here
     VITE_SPOTIFY_CLIENT_SECRET=your_client_secret_here
     ```
   - Replace `your_client_id_here` and `your_client_secret_here` with your actual credentials

5. **Restart Your Development Server**
   - Stop your current dev server (if running)
   - Start it again: `npm run dev`

## Usage

Once configured, you can:
- Access the Spotify Integration page from the Admin Panel
- Search for artists and tracks
- Import metadata (artist names, album covers, release dates, etc.)
- Batch import albums and tracks

## Important Notes

- **Lyrics are NOT imported from Spotify** - Lyrics must still be uploaded manually
- The Spotify integration is for metadata only (artist data, song titles, album info, images)
- API credentials are stored in environment variables and should never be committed to version control
- The service uses Client Credentials flow, which is suitable for server-side or app-only authentication
- **Redirect URI Note**: Even though we use Client Credentials flow (which doesn't require user authorization), Spotify's dashboard requires you to enter at least one redirect URI. Use a placeholder like `http://localhost:3000/callback` - it won't be used but must be in a valid URL format

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

