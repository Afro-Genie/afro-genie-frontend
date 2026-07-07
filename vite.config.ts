import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy Genius API with Authorization header injected from env
          '/proxy/genius': {
            target: 'https://api.genius.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/proxy\/genius/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                const token = env.GENIUS_ACCESS_TOKEN || '';
                if (token) {
                  proxyReq.setHeader('Authorization', `Bearer ${token}`);
                }
              });
            }
          },
          // Proxy MusicBrainz (no special headers, just CORS bypass)
          '/proxy/musicbrainz': {
            target: 'https://musicbrainz.org',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/proxy\/musicbrainz/, ''),
          },
          // Proxy Last.fm and inject API key if missing
          '/proxy/lastfm': {
            target: 'https://ws.audioscrobbler.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/proxy\/lastfm/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq: any) => {
                const apiKey = env.LASTFM_API_KEY || '';
                if (!apiKey) return;
                try {
                  const hasApiKey = typeof proxyReq.path === 'string' && proxyReq.path.includes('api_key=');
                  if (!hasApiKey) {
                    const joiner = proxyReq.path.includes('?') ? '&' : '?';
                    proxyReq.path = `${proxyReq.path}${joiner}api_key=${encodeURIComponent(apiKey)}`;
                  }
                } catch {}
              });
            }
          },
          // Proxy LyricFind API and inject API key/username as query params
          '/proxy/lyricfind': {
            target: 'https://api.lyricfind.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/proxy\/lyricfind/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq: any) => {
                const apiKey = env.LYRICFIND_API_KEY || '';
                const username = env.LYRICFIND_USERNAME || '';
                
                if (apiKey || username) {
                  try {
                    const hasApiKey = typeof proxyReq.path === 'string' && proxyReq.path.includes('apikey=');
                    const hasUsername = typeof proxyReq.path === 'string' && proxyReq.path.includes('username=');
                    
                    if (!hasApiKey && apiKey) {
                      const joiner = proxyReq.path.includes('?') ? '&' : '?';
                      proxyReq.path = `${proxyReq.path}${joiner}apikey=${encodeURIComponent(apiKey)}`;
                    }
                    
                    if (!hasUsername && username) {
                      const joiner = proxyReq.path.includes('?') ? '&' : '?';
                      proxyReq.path = `${proxyReq.path}${joiner}username=${encodeURIComponent(username)}`;
                    }
                  } catch (e) {
                    console.error('Error injecting LyricFind credentials:', e);
                  }
                }
                
                proxyReq.setHeader('User-Agent', 'AfroGenie/1.0');
              });
            }
          },
          // Proxy API requests to the Express backend
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
          // Proxy TheAudioDB API to avoid CORS issues
          '/proxy/theaudiodb': {
            target: 'https://theaudiodb.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/proxy\/theaudiodb/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq: any) => {
                proxyReq.setHeader('User-Agent', 'AfroGenie/1.0');
              });
            }
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SPOTIFY_CLIENT_ID': JSON.stringify(env.VITE_SPOTIFY_CLIENT_ID || env.SPOTIFY_CLIENT_ID || ''),
        'import.meta.env.VITE_LYRICFIND_API_KEY': JSON.stringify(env.LYRICFIND_API_KEY || ''),
        'import.meta.env.VITE_LYRICFIND_USERNAME': JSON.stringify(env.LYRICFIND_USERNAME || ''),
        'import.meta.env.VITE_GENIUS_ACCESS_TOKEN': JSON.stringify(env.GENIUS_ACCESS_TOKEN || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
