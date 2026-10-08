import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const isIpLiteralHost = (host: string): boolean => {
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname.startsWith('[')) return true; // e.g. [::1]
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
};

// YouTube blocks embeds served from IP-literal origins (e.g. http://127.0.0.1:3000
// fails with player error 150) but allows http://localhost:3000. Redirect any
// document navigation from an IP-literal host to localhost, preserving
// protocol, port and the #/ hash route.
const redirectIpHostsToLocalhost = (): Plugin => ({
  name: 'redirect-ip-hosts-to-localhost',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const host = req.headers.host;
      const acceptsHtml = (req.headers.accept || '').includes('text/html');
      if (host && isIpLiteralHost(host) && acceptsHtml) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(
          `<!doctype html><script>` +
            `location.replace(location.protocol + '//localhost:' + location.port + location.pathname + location.search + location.hash)` +
            `<\/script>`,
        );
        return;
      }
      next();
    });
  },
});

// HTTPS for local dev: optional, opt-in via VITE_DEV_HTTPS=true in .env
// Run once: mkcert -install && mkcert 127.0.0.1
// Then set VITE_DEV_HTTPS=true in your .env to enable HTTPS.
// Without this, the dev server runs plain HTTP on http://127.0.0.1:3000
function getHttpsConfig() {
  const enabled = process.env.VITE_DEV_HTTPS === 'true';
  if (!enabled) return undefined;

  const certPath = path.resolve(__dirname, '127.0.0.1.pem');
  const keyPath = path.resolve(__dirname, '127.0.0.1-key.pem');

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }

  // Fallback: let Vite generate a self-signed cert automatically
  return {} as Record<string, unknown>;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        strictPort: true,
        host: '127.0.0.1',
        https: getHttpsConfig(),
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
          // Proxy uploaded media (images/audio) served by the backend so
          // relative "/uploads/..." URLs work during local development.
          '/uploads': {
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
      plugins: [react(), redirectIpHostsToLocalhost()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
