# Genius API Setup Guide

## Credentials

Your Genius API credentials have been configured. To use them, create a `.env.local` file in the root directory with the following content:

```env
# Genius API Credentials
GENIUS_ACCESS_TOKEN=your_genius_access_token_here
GENIUS_CLIENT_ID=your_genius_client_id_here
GENIUS_CLIENT_SECRET=your_genius_client_secret_here
```

## Setup Instructions

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add the credentials above to the file
3. Restart your development server for the changes to take effect

## How It Works

The Genius API is configured to work through a proxy in `vite.config.ts`:
- The proxy automatically injects the `Authorization: Bearer {GENIUS_ACCESS_TOKEN}` header
- API calls are made through `/proxy/genius/*` endpoints
- The access token is used for all Genius API requests

## Usage

The Genius API is automatically used in:
- **LyricsManager** - API Import tab for searching and importing songs
- **LyricImporter** - Search functionality for finding songs with lyrics
- **LyricAPIService** - Fallback when LyricFind is unavailable

## API Limits

- Rate limit: 60 requests per minute (free tier)
- The service includes automatic retry logic and error handling

## Security Note

⚠️ **Important**: The `.env.local` file is gitignored and should never be committed to version control. Keep your API credentials secure.

