import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Frontend test runner (REMEDIATION-PLAN.md 7.8, audit 9.4 step 17).
 *
 * This is a separate file rather than a `test` block in `vite.config.ts` on
 * purpose. `vite.config.ts` is a function of `mode` and calls
 * `loadEnv(mode, '.', '')`, which always reads the developer's real `.env` and
 * inlines the real Gemini / Spotify / Genius / LyricFind credentials into the
 * `define` map. Reusing it would make a test run depend on — and expose — local
 * secrets. A standalone config keeps the runner hermetic: no proxy targets, no
 * credential injection, no network.
 *
 * Tests still need the React plugin (JSX) and the `@/*` path alias, both of
 * which are re-declared here rather than inherited.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // jsdom, not node: the whole point is to exercise DOM-dependent playback
    // code (`YouTubePlayer`, `PlaybackManager`, the `AudioContext` provider),
    // which is exactly what audit M-1/M-2/M-6 flagged as unproven at runtime.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    // Fail the run rather than let a hung playback timer wedge CI.
    testTimeout: 10_000,
    restoreMocks: true,
  },
});
