import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import type { YouTubePlayerHandle } from '@/components/YouTubePlayer';

/**
 * Coverage for the two defects in `ensureYouTubeApi` and the mount effect
 * (REMEDIATION-PLAN.md 2.22 and 2.23, audit M-1 / M-2).
 *
 * These live in their own file for one reason: `ensureYouTubeApi` caches its
 * promise in a *module-level* variable, so its behaviour can only be observed
 * from a known starting state. `vi.resetModules()` plus a dynamic import gives
 * each test a freshly evaluated module, which is the only way to test the
 * "no promise cached yet" branch at all. Folding these into
 * `YouTubePlayer.test.tsx` would make them order-dependent.
 */

type PlayerOptions = { videoId?: string };

class FakePlayer {
  options: PlayerOptions;
  loadedVideoId: string | null;
  destroyed = false;
  state = -1;

  constructor(_element: string | HTMLElement, options: PlayerOptions) {
    this.options = options;
    this.loadedVideoId = options.videoId ?? null;
  }
  playVideo() {}
  pauseVideo() {}
  stopVideo() {}
  seekTo() {}
  loadVideoById(videoId: string) {
    this.loadedVideoId = videoId;
  }
  cueVideoById() {}
  getCurrentTime() {
    return 0;
  }
  getDuration() {
    return 0;
  }
  getPlayerState() {
    return this.state;
  }
  getVideoData() {
    return { video_id: this.loadedVideoId ?? undefined };
  }
  setVolume() {}
  getVolume() {
    return 100;
  }
  mute() {}
  unMute() {}
  destroy() {
    this.destroyed = true;
  }
}

let players: FakePlayer[] = [];

const installApi = () => {
  const Player = vi.fn(function (this: FakePlayer, element: string | HTMLElement, options: PlayerOptions) {
    const player = new FakePlayer(element, options);
    players.push(player);
    return player;
  });
  (window as unknown as { YT: unknown }).YT = { Player, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 } };
};

/** The `<script>` the component appends to request the IFrame API. */
const scriptTag = () => document.getElementById('youtube-iframe-api');

/** Pretend the remote script loaded and the API announced itself. */
const resolveApiLoad = async () => {
  installApi();
  await act(async () => {
    (window as unknown as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady?.();
  });
};

/** A fresh copy of the component, with an empty `apiPromise` cache. */
const freshComponent = async () => {
  vi.resetModules();
  return (await import('@/components/YouTubePlayer')).default;
};

beforeEach(() => {
  players = [];
  delete (window as unknown as { YT?: unknown }).YT;
  delete (window as unknown as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady;
  document.getElementById('youtube-iframe-api')?.remove();
});

afterEach(() => {
  delete (window as unknown as { YT?: unknown }).YT;
  delete (window as unknown as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady;
  document.getElementById('youtube-iframe-api')?.remove();
});

describe('YouTubePlayer — IFrame API loading', () => {
  it('2.23: a failed script load surfaces an error and does not poison the module', async () => {
    const YouTubePlayer = await freshComponent();
    const ref = createRef<YouTubePlayerHandle>();
    // `showControls` gates the only place the error is rendered, so the failure
    // is invisible in the default audio-only layout.
    const { unmount } = render(<YouTubePlayer ref={ref} videoId="vid-1" showControls />);

    // No preloaded API, so the component must request the script.
    await waitFor(() => expect(scriptTag()).not.toBeNull());
    expect(players).toHaveLength(0);

    await act(async () => {
      scriptTag()!.dispatchEvent(new Event('error'));
    });

    // The failure is reported rather than swallowed.
    expect(await screen.findByText(/unavailable right now/i)).toBeTruthy();

    // The critical assertion: the rejected promise is not cached. Previously
    // `apiPromise` stayed set, so this second mount reused the rejection and
    // never even asked for the script again — the component stayed broken until
    // a full page reload.
    unmount();
    const ref2 = createRef<YouTubePlayerHandle>();
    render(<YouTubePlayer ref={ref2} videoId="vid-2" showControls />);

    await waitFor(() => expect(scriptTag()).not.toBeNull());
    await resolveApiLoad();
    await waitFor(() => expect(players).toHaveLength(1));
    expect(players[0].options.videoId).toBe('vid-2');
  });

  it('2.22: a videoId that changes while the API is still loading is not dropped', async () => {
    const YouTubePlayer = await freshComponent();
    const ref = createRef<YouTubePlayerHandle>();
    const { rerender } = render(<YouTubePlayer ref={ref} videoId="first" />);

    // The API request is in flight and no player exists yet.
    await waitFor(() => expect(scriptTag()).not.toBeNull());
    expect(players).toHaveLength(0);

    // The track changes mid-flight. The `[videoId]` effect fires here and finds
    // no player, so it returns early — the constructor is the only thing that
    // can still pick this up, and it used to read the first render's prop.
    rerender(<YouTubePlayer ref={ref} videoId="second" />);

    await resolveApiLoad();

    await waitFor(() => expect(players).toHaveLength(1));
    expect(players[0].options.videoId).toBe('second');
  });

  it('2.22: a videoId change after the player exists still swaps the video', async () => {
    const YouTubePlayer = await freshComponent();
    const ref = createRef<YouTubePlayerHandle>();
    const { rerender } = render(<YouTubePlayer ref={ref} videoId="first" />);

    await waitFor(() => expect(scriptTag()).not.toBeNull());
    await resolveApiLoad();
    await waitFor(() => expect(players).toHaveLength(1));
    expect(players[0].loadedVideoId).toBe('first');

    rerender(<YouTubePlayer ref={ref} videoId="second" />);

    await waitFor(() => expect(players[0].loadedVideoId).toBe('second'));
    // The player is reused, not rebuilt — that is the point of the swap path.
    expect(players).toHaveLength(1);
  });

  it('a preloaded API skips the script request entirely', async () => {
    installApi();
    const YouTubePlayer = await freshComponent();
    const ref = createRef<YouTubePlayerHandle>();
    render(<YouTubePlayer ref={ref} videoId="vid-3" />);

    await waitFor(() => expect(players).toHaveLength(1));
    expect(scriptTag()).toBeNull();
    expect(players[0].options.videoId).toBe('vid-3');
  });
});
