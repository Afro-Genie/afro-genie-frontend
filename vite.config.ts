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
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
