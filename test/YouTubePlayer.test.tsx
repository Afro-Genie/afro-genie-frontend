import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createRef } from 'react';
import YouTubePlayer, {
  type YouTubePlayerHandle,
  type YouTubePlaybackState,
} from '@/components/YouTubePlayer';

/**
 * Runtime coverage for `YouTubePlayer` (REMEDIATION-PLAN.md 7.8, audit 9.4 step
 * 17 / M-1). Before this runner existed, the component was "verified by review +
 * typecheck + build only", which is not the same as knowing the imperative
 * handle wires up or that the state machine reacts to player events.
 *
 * The YouTube IFrame API is a browser global that loads a remote script. It is
 * faked here rather than stubbed at the module boundary, because the component
 * talks to `window.YT` / `window.onYouTubeIframeAPIReady` directly — testing
 * the real integration point is the whole point of the test.
 */

type PlayerOptions = {
  videoId?: string;
  events?: {
    onReady?: (e: { target: FakePlayer }) => void;
    onStateChange?: (e: { target: FakePlayer; data: number }) => void;
    onError?: (e: { target: FakePlayer; data: number }) => void;
  };
};

/** Minimal stand-in for `YT.Player` that records what the component asked for. */
class FakePlayer {
  options: PlayerOptions;
  currentTime = 0;
  duration = 0;
  state = -1;
  volume = 100;
  destroyed = false;
  loadedVideoId: string | null = null;
  playCalls = 0;
  pauseCalls = 0;

  constructor(_element: string | HTMLElement, options: PlayerOptions) {
    this.options = options;
    this.loadedVideoId = options.videoId ?? null;
  }

  playVideo() {
    this.playCalls += 1;
    this.state = 1;
  }
  pauseVideo() {
    this.pauseCalls += 1;
    this.state = 2;
  }
  stopVideo() {}
  seekTo(seconds: number) {
    this.currentTime = seconds;
  }
  loadVideoById(videoId: string) {
    this.loadedVideoId = videoId;
  }
  cueVideoById() {}
  getCurrentTime() {
    return this.currentTime;
  }
  getDuration() {
    return this.duration;
  }
  getPlayerState() {
    return this.state;
  }
  getVideoData() {
    return { video_id: this.loadedVideoId ?? undefined };
  }
  setVolume(volume: number) {
    this.volume = volume;
  }
  getVolume() {
    return this.volume;
  }
  mute() {}
  unMute() {}
  destroy() {
    this.destroyed = true;
  }
}

/** Every player the component constructed, newest last. */
let players: FakePlayer[] = [];
let playerConstructorSpy: ReturnType<typeof vi.fn>;

const emitReady = (player: FakePlayer) => {
  player.options.events?.onReady?.({ target: player });
};
const emitState = (player: FakePlayer, data: number) => {
  // The real API updates its own state before the handler runs, and the
  // component's 500ms poll re-reads it via getPlayerState(). Without this the
  // fake would still report UNSTARTED and every polled read would look paused.
  player.state = data;
  player.options.events?.onStateChange?.({ target: player, data });
};
const emitError = (player: FakePlayer, data: number) => {
  player.options.events?.onError?.({ target: player, data });
};

/** Install a fake `window.YT` before render, mirroring a preloaded API. */
const installYouTubeApi = () => {
  const Player = vi.fn(function (this: FakePlayer, element: string | HTMLElement, options: PlayerOptions) {
    const player = new FakePlayer(element, options);
    players.push(player);
    return player;
  });
  (window as unknown as { YT: unknown }).YT = { Player, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 } };
};

const latestPlayer = () => players[players.length - 1];

beforeEach(() => {
  players = [];
  installYouTubeApi();
  playerConstructorSpy = vi.fn();
});

afterEach(() => {
  delete (window as unknown as { YT?: unknown }).YT;
  delete (window as unknown as { onYouTubeIframeAPIReady?: unknown }).onYouTubeIframeAPIReady;
});

describe('YouTubePlayer', () => {
  it('constructs the player once the API is available', async () => {
    render(<YouTubePlayer videoId="abc123" />);

    await waitFor(() => expect(players).toHaveLength(1));
    expect(latestPlayer().options.videoId).toBe('abc123');
  });

  it('exposes a working imperative handle through onReady', async () => {
    const onReady = vi.fn();
    // autoplay={false} so the only playVideo() call is the one the handle makes;
    // with autoplay on, the onReady handler already played once.
    render(<YouTubePlayer videoId="abc123" autoplay={false} onReady={onReady} />);

    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();

    await act(async () => {
      emitReady(player);
    });

    expect(onReady).toHaveBeenCalledTimes(1);
    const handle = onReady.mock.calls[0][0] as YouTubePlayerHandle;

    act(() => handle.play());
    expect(player.playCalls).toBe(1);

    act(() => handle.pause());
    expect(player.pauseCalls).toBe(1);

    act(() => handle.seek(42));
    expect(player.currentTime).toBe(42);
    expect(handle.getCurrentTime()).toBe(42);
  });

  it('clamps the volume handed to the player to 0-100', async () => {
    const handleRef = createRef<YouTubePlayerHandle>();
    render(<YouTubePlayer videoId="abc123" ref={handleRef} volume={0.5} />);

    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();
    await act(async () => {
      emitReady(player);
    });

    act(() => handleRef.current?.setVolume(2));
    expect(player.volume).toBe(100);

    act(() => handleRef.current?.setVolume(-1));
    expect(player.volume).toBe(0);
  });

  it('reports playing/paused from player events, and time via the poll timer', async () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onTimeUpdate = vi.fn();
    const onStateChange = vi.fn<(s: YouTubePlaybackState) => void>();
    render(
      <YouTubePlayer
        videoId="abc123"
        autoplay={false}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onStateChange={onStateChange}
      />,
    );

    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();
    await act(async () => {
      emitReady(player);
    });

    // The player event drives play/pause callbacks only...
    act(() => {
      player.currentTime = 12;
      player.duration = 240;
      emitState(player, 1); // PLAYING
    });
    expect(onPlay).toHaveBeenCalledTimes(1);

    // ...while onStateChange/onTimeUpdate are emitted by the component's own
    // 500ms poll of the player, not pushed by the API. Asserting the push model
    // here would have been a false failure, so the test documents the real one.
    await waitFor(() =>
      expect(onStateChange).toHaveBeenCalledWith({ isPlaying: true, currentTime: 12, duration: 240 }),
    );
    expect(onTimeUpdate).toHaveBeenCalledWith(12, 240);

    act(() => emitState(player, 2)); // PAUSED
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('does not autoplay when autoplay is off', async () => {
    render(<YouTubePlayer videoId="abc123" autoplay={false} />);
    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();

    await act(async () => {
      emitReady(player);
    });
    expect(player.playCalls).toBe(0);
  });

  it('surfaces a player error both in the UI and to the caller', async () => {
    const onError = vi.fn();
    render(
      <YouTubePlayer videoId="abc123" showControls title="Track" onError={onError} />,
    );

    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();

    await act(async () => {
      emitError(player, 150);
    });

    expect(onError).toHaveBeenCalledWith(150);
    expect(await screen.findByText('This track is unavailable on YouTube.')).toBeInTheDocument();
  });

  it('loads a new video in place when videoId changes', async () => {
    const { rerender } = render(<YouTubePlayer videoId="first" autoplay={false} />);
    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();
    await act(async () => {
      emitReady(player);
    });

    rerender(<YouTubePlayer videoId="second" autoplay={false} />);

    await waitFor(() => expect(player.loadedVideoId).toBe('second'));
    // Swapping the video must not tear down and rebuild the player.
    expect(players).toHaveLength(1);
  });

  it('destroys the player on unmount', async () => {
    const { unmount } = render(<YouTubePlayer videoId="abc123" />);
    await waitFor(() => expect(players).toHaveLength(1));
    const player = latestPlayer();

    unmount();
    expect(player.destroyed).toBe(true);
  });
});
