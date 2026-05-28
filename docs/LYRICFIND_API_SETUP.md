# LyricFind API Setup Guide

## What is LyricFind?

[LyricFind](https://docs.lyricfind.com/) is a commercial lyrics licensing service that provides access to a large database of licensed lyrics. Unlike free APIs like Genius, LyricFind requires:

- **Paid subscription or partnership** with LyricFind
- **API credentials** (API Key and Username) from their platform
- **Licensing agreement** for commercial use

## Current Status

Your application is **already configured** to use LyricFind API, but it requires credentials to work. The system will automatically fall back to Genius API if LyricFind credentials are not available.

## How to Get LyricFind Credentials

1. **Visit LyricFind**: Go to [https://www.lyricfind.com/](https://www.lyricfind.com/)
2. **Contact Sales**: LyricFind is a commercial service - you'll need to:
   - Sign up for an account
   - Contact their sales team for API access
   - Get pricing information (usually requires a paid subscription)
   - Receive your API Key and Username

3. **Documentation**: The link you found ([https://docs.lyricfind.com/](https://docs.lyricfind.com/)) is their API documentation, but you'll need active credentials to use it.

## Configuration (If You Have Credentials)

If you have LyricFind API credentials, add them to your `.env.local` file:

```env
# LyricFind API Credentials (if you have a subscription)
LYRICFIND_API_KEY=your_lyricfind_api_key_here
LYRICFIND_USERNAME=your_lyricfind_username_here
```

## How It Works in Your App

1. **Primary**: LyricFind API (if configured) - provides licensed lyrics
2. **Fallback**: Genius API (already configured) - free alternative
3. **System automatically switches** between them based on availability

## Current Setup

✅ **Genius API**: Configured and working (free)
⚠️ **LyricFind API**: Ready but needs credentials (paid service)

## Recommendation

For most use cases, **Genius API is sufficient** and is already working in your application. LyricFind is only necessary if you:
- Need licensed lyrics for commercial distribution
- Require a specific catalog that Genius doesn't have
- Have a budget for a paid lyrics API service

## Testing

Your app will work perfectly with just Genius API. To test:
1. Go to Admin Panel → Lyrics Manager → API Import
2. Search for songs
3. Import songs - lyrics will be fetched from Genius API automatically

The system is designed to work without LyricFind, so you don't need to worry about it unless you specifically need their licensed content.

