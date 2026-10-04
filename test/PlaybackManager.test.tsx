import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

/**
 * Direct coverage for the callback bridge in <PlaybackManager>
 * (REMEDIATION-PLAN.md 2.24, audit M-6).
 *
 * The tier-1 and tier-2 tests in `AudioContext.test.tsx` prove the audio engine
 * reports correctly, and `YouTubePlayer.test.tsx` proves the embed reports
 * correctly. Neither proves the two are *connected* — that the component
 * actually forwards the embed's `onPlay` to the audio engine's
 * `handleYouTubePlay`. That single prop is the entire mechanism 2.24 relies on
 * to stop reporting a play the user never heard, and an audit found it missing
 * from the code with nothing to catch its removal.
 */

/** Props the mocked YouTubePlayer was last rendered with. */
let playerProps: Record<string, unknown> | null = null;

vi.mock('@/components/YouTubePlayer', () => ({
  default: (props: Record<string, unknown>) => {
    playerProps = props;
    return null;
  },
}));

// The Phase 4 rollout flag defaults to off, which makes <PlaybackManager> render
// `null` for everything. Enabling it here is the point: the bridge is the
// production shape once the flag is on.
vi.mock('@/config/featureFlags', () => ({
  featureFlags: { youtubePlayback: true },
  spotifyProxyBaseUrl: 'http://localhost:3001/api',
}));

const audioContext = {
  playbackMode: 'youtube' as string,
  youtubeVideoId: 'yt-abc' as string | null,
  currentTrack: { name: 'My Song', artistName: 'My Artist', imageUrl: null } as
    | { name: string; artistName: string; imageUrl: string | null }
    | null,
  registerYouTubeController: vi.fn(),
  reportYouTubeState: vi.fn(),
  handleYouTubeEnded: vi.fn(),
  handleYouTubeError: vi.fn(),
  handleYouTubePlay: vi.fn(),
};

vi.mock('@/context/AudioContext', () => ({
  useAudioPlayer: () => audioContext,
}));

import PlaybackManager from '@/components/PlaybackManager';

/** The youtube tier is the default; pass overrides to take a different branch. */
const setPlayer = (overrides: Record<string, unknown> = {}) => {
  Object.assign(audioContext, {
    playbackMode: 'youtube',
    youtubeVideoId: 'yt-abc',
    currentTrack: { name: 'My Song', artistName: 'My Artist', imageUrl: null },
    ...overrides,
  });
};

const emit = (name: string, ...args: unknown[]) => {
  const handler = playerProps?.[name];
  if (typeof handler !== 'function') throw new Error(`${name} was not wired to a function`);
  act(() => {
    (handler as (...a: unknown[]) => void)(...args);
  });
};

beforeEach(() => {
  playerProps = null;
  vi.clearAllMocks();
});

describe('PlaybackManager — YouTube callback bridge', () => {
  it('forwards the embed\'s onPlay to the audio engine', () => {
    setPlayer();
    render(<PlaybackManager />);

    // The embed reports a real start; that must reach the reporting gate.
    emit('onPlay');

    expect(audioContext.handleYouTubePlay).toHaveBeenCalledTimes(1);
  });

  it('forwards onError, onEnd, and onStateChange', () => {
    setPlayer();
    render(<PlaybackManager />);

    emit('onError', 150);
    emit('onEnd');
    emit('onStateChange', { isPlaying: true, currentTime: 12, duration: 180 });

    expect(audioContext.handleYouTubeError).toHaveBeenCalledWith(150);
    expect(audioContext.handleYouTubeEnded).toHaveBeenCalledTimes(1);
    expect(audioContext.reportYouTubeState).toHaveBeenCalledWith({
      isPlaying: true,
      currentTime: 12,
      duration: 180,
    });
  });

  it('passes autoplay on, so the tier-2 play is not a user-gesture problem', () => {
    setPlayer();
    render(<PlaybackManager />);

    expect(playerProps?.autoplay).toBe(true);
  });

  it('registers a controller once the embed is ready, and clears it on unmount', () => {
    setPlayer();
    const { unmount } = render(<PlaybackManager />);

    // Nothing is registered before onReady: a controller would point at a
    // player that does not exist yet.
    expect(audioContext.registerYouTubeController).not.toHaveBeenCalledWith(expect.anything());

    emit('onReady');
    expect(audioContext.registerYouTubeController).toHaveBeenCalledWith(
      expect.objectContaining({
        play: expect.any(Function),
        pause: expect.any(Function),
        seek: expect.any(Function),
        setVolume: expect.any(Function),
      }),
    );

    unmount();
    expect(audioContext.registerYouTubeController).toHaveBeenLastCalledWith(null);
  });

  it('renders no embed outside the youtube tier, so no play can be reported', () => {
    setPlayer({ playbackMode: 'preview' });
    render(<PlaybackManager />);

    expect(playerProps).toBeNull();
  });

  it('renders no embed without a video id', () => {
    setPlayer({ youtubeVideoId: null });
    render(<PlaybackManager />);

    expect(playerProps).toBeNull();
  });
});
