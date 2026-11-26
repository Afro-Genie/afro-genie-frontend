import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Shared frontend test setup (REMEDIATION-PLAN.md 7.8).
 *
 * The backend suite is run against a disposable database and refuses to touch
 * production (Stage 7.1-7.2); the frontend has the same problem in a different
 * shape — a component that fetches on mount will happily hit whatever
 * `VITE_API_URL` happens to point at. So the two rules enforced here are:
 *
 *  1. `fetch` is stubbed by default. A test that genuinely needs the network
 *     opts in explicitly, which keeps the default path inert.
 *  2. Anything mounted is unmounted between tests, so a leaked `setInterval`
 *     from a playback component cannot bleed into the next test.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * jsdom implements neither of these, and the playback components touch both:
 * `YouTubePlayer` reaches for the IFrame API, and `AudioContext` wraps the Web
 * Audio API. Without a stub, a test throws "not implemented" instead of
 * exercising the component's own logic.
 */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/**
 * jsdom does not implement media playback, so every `audio.load()` logs
 * "Not implemented" to stderr and floods the reporter. The components under
 * test only care that the calls happened, so stub them. `src` is left real —
 * several assertions read it.
 *
 * Installed in `beforeEach`, not once at module scope, because the config sets
 * `restoreMocks: true`: that resets every `vi.fn()` between tests, which quietly
 * stripped the `mockResolvedValue` off `play()`. From the second test onward
 * `audio.play()` returned `undefined`, so production code doing
 * `audio.play().then(...)` threw a TypeError — a failure in the test harness
 * that presented as a failure in the component. Re-installing per test keeps
 * them spies *and* keeps `play()` returning a promise.
 */
function installMediaStubs() {
  if (typeof HTMLMediaElement === 'undefined') return;
  HTMLMediaElement.prototype.load = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
}

installMediaStubs();
beforeEach(() => {
  installMediaStubs();
});
