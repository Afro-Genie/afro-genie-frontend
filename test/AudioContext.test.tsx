import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

/**
 * Runtime coverage for the `AudioProvider` source-tier routing
 * (REMEDIATION-PLAN.md 7.8, audit 9.4 step 17 / M-6).
 *
 * `context/AudioContext.tsx` is the piece that decides whether a song plays
 * from the artist's own upload, a YouTube embed, a 30-second Spotify preview, or
 * nothing at all. Getting that order wrong is user-visible and was previously
 * only checked by review + typecheck + build.
 *
 * The four collaborators are mocked rather than exercised for real: the audio
 * element is jsdom's (which cannot decode media), and `spotifyService` /
 * `playbackApi` would otherwise issue network calls. The assertions are all on
 * this module's own branching.
 */

const getPlaybackSource = vi.fn();
const reportPlaybackEvent = vi.fn().mockResolvedValue(undefined);
const searchBestTrackSummary = vi.fn();
const getTrack = vi.fn();
const playTrack = vi.fn().mockResolvedValue(true);

const webPlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  currentTrackUri: null as string | null,
  currentTrackName: '',
  currentTrackArtist: '',
  isReady: false,
  sdkPlaybackFailed: false,
  playTrack,
  togglePlay: vi.fn().mockResolvedValue(undefined),
  seek: vi.fn(),
  clearSdkPlaybackFailed: vi.fn(),
};

const authState = { isSpotifyPremium: false };

vi.mock('../services/playbackService', () => ({
  playbackApi: {
    getPlaybackSource: (...args: unknown[]) => getPlaybackSource(...args),
    reportPlaybackEvent: (...args: unknown[]) => reportPlaybackEvent(...(args as [])),
  },
}));

vi.mock('../services/spotifyService', () => ({
  spotifyService: {
    searchBestTrackSummary: (...args: unknown[]) => searchBestTrackSummary(...args),
    getTrack: (...args: unknown[]) => getTrack(...args),
  },
}));

vi.mock('../lib/apiBase', () => ({
  toMediaUrl: (url: string) => (url.startsWith('http') ? url : `http://media.test${url}`),
}));

vi.mock('../config/featureFlags', () => ({
  featureFlags: { youtubePlayback: true },
  spotifyProxyBaseUrl: 'http://localhost:0/api',
}));

vi.mock('../context/WebPlaybackContext', () => ({
  useWebPlayback: () => webPlaybackState,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

import { AudioProvider, useAudioPlayer } from '../context/AudioContext';

type AudioApi = ReturnType<typeof useAudioPlayer>;
let api: AudioApi;

function Harness() {
  api = useAudioPlayer();
  return (
    <div>
      <span data-testid="mode">{api.playbackMode}</span>
      <span data-testid="source">{api.playbackSource ?? 'none'}</span>
      <span data-testid="video">{api.youtubeVideoId ?? 'none'}</span>
      <span data-testid="songId">{api.currentSongId ?? 'none'}</span>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AudioProvider>
      <Harness />
    </AudioProvider>,
  );

const mode = () => screen.getByTestId('mode').textContent;
const source = () => screen.getByTestId('source').textContent;
const videoId = () => screen.getByTestId('video').textContent;

beforeEach(() => {
  getPlaybackSource.mockReset();
  reportPlaybackEvent.mockClear();
  searchBestTrackSummary.mockReset();
  getTrack.mockReset();
  playTrack.mockClear();
  webPlaybackState.isReady = false;
  authState.isSpotifyPremium = false;
});

describe('AudioProvider source-tier routing', () => {
  it('tier 1: plays the artist upload when the source is AUDIO_URL', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'AUDIO_URL',
      audioUrl: '/uploads/mysong.mp3',
      song: { title: 'My Song', artist: 'My Artist' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-1');
    });

    expect(mode()).toBe('preview');
    expect(source()).toBe('AUDIO_URL');
    expect(api.getAudioElement()?.getAttribute('src')).toContain('/uploads/mysong.mp3');
    // 2.24 / M-6: selecting a tier is not a play. `loadTrackBySongId` sets the
    // element's src and calls load(), which starts nothing — so no `play` may be
    // reported yet. The anti-fraud counter (2.16) is fed from the real event.
    expect(reportPlaybackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'play' }),
    );

    // The element's own `play` event is what reports, and it reports once.
    const audio = api.getAudioElement()!;
    await act(async () => {
      audio.dispatchEvent(new Event('play'));
    });
    expect(reportPlaybackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'song-1', source: 'AUDIO_URL', eventType: 'play' }),
    );

    // Pause/resume must not inflate the count: one `play` per track.
    await act(async () => {
      audio.dispatchEvent(new Event('play'));
    });
    expect(reportPlaybackEvent).toHaveBeenCalledTimes(1);
  });

  it('tier 2: mounts the YouTube embed when the source is YOUTUBE', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'YOUTUBE',
      youtubeVideoId: 'yt-abc',
      song: { title: 'My Song', artist: 'My Artist' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-2');
    });

    expect(mode()).toBe('youtube');
    expect(videoId()).toBe('yt-abc');
    // 2.24 / M-6: mounting the embed is not a play either — the iframe has not
    // loaded, let alone started. Nothing is reported until the embed says so.
    expect(reportPlaybackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'play' }),
    );

    await act(async () => {
      api.handleYouTubePlay();
    });
    expect(reportPlaybackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'YOUTUBE', eventType: 'play' }),
    );
  });

  it('tier 3: uses the Spotify preview when no upload and no YouTube id exist', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'SPOTIFY_PREVIEW',
      previewUrl: 'https://p.scdn.co/preview.mp3',
      song: { title: 'My Song', artist: 'My Artist' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-3');
    });

    expect(mode()).toBe('preview');
    expect(source()).toBe('SPOTIFY_PREVIEW');
  });

  it('falls back to a title/artist Spotify lookup when the source tier has nothing', async () => {
    getPlaybackSource.mockResolvedValue({ source: 'NONE', song: { title: 'My Song' } });
    searchBestTrackSummary.mockResolvedValue({
      id: 'sp-1',
      name: 'My Song',
      artistName: 'My Artist',
      previewUrl: 'https://p.scdn.co/fallback.mp3',
      albumName: null,
      imageUrl: null,
      spotifyUri: null,
      durationMs: 0,
      externalUrl: null,
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-4', 'My Song', 'My Artist');
    });

    expect(searchBestTrackSummary).toHaveBeenCalledWith('My Artist', 'My Song', { requirePreview: true });
    expect(mode()).toBe('preview');
  });

  it('reports a skipped track when switching between two database songs', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'AUDIO_URL',
      audioUrl: '/uploads/a.mp3',
      song: { title: 'A' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-a');
    });
    reportPlaybackEvent.mockClear();

    getPlaybackSource.mockResolvedValue({
      source: 'AUDIO_URL',
      audioUrl: '/uploads/b.mp3',
      song: { title: 'B' },
    });
    await act(async () => {
      await api.loadTrackBySongId('song-b');
    });

    expect(reportPlaybackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'song-a', eventType: 'skip' }),
    );
    expect(screen.getByTestId('songId').textContent).toBe('song-b');
  });

  it('ignores a repeat load of the same song', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'AUDIO_URL',
      audioUrl: '/uploads/a.mp3',
      song: { title: 'A' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-x');
    });
    await act(async () => {
      await api.loadTrackBySongId('song-x');
    });

    expect(getPlaybackSource).toHaveBeenCalledTimes(1);
  });

  it('a YouTube error with no fallback stops playback rather than guessing a source', async () => {
    getPlaybackSource.mockResolvedValue({
      source: 'YOUTUBE',
      youtubeVideoId: 'yt-abc',
      song: { title: 'My Song' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-5');
    });
    expect(mode()).toBe('youtube');

    // <PlaybackManager> reports an embed error; with no preview captured there
    // is nothing safe to fall back to.
    act(() => api.handleYouTubeError());

    await waitFor(() => expect(mode()).toBe('none'));
    expect(videoId()).toBe('none');
  });

  it('reports a fallback play against the source the server served, not the degraded tier', async () => {
    // The server rejects a `play` whose source disagrees with its own resolution
    // (409 SOURCE_MISMATCH), and only `play` is validated that way. So when the
    // embed dies and we fall back to the Spotify preview, the play we report must
    // still say YOUTUBE — reporting SPOTIFY_PREVIEW would be refused and the
    // view/leaderboard increment lost for a track that really did play.
    getPlaybackSource.mockResolvedValue({
      source: 'YOUTUBE',
      youtubeVideoId: 'yt-abc',
      previewUrl: 'https://p.scdn.co/preview.mp3',
      song: { title: 'My Song' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-6');
    });
    expect(mode()).toBe('youtube');

    await act(async () => {
      api.handleYouTubeError();
    });

    // The UI is honest about what is actually playing...
    expect(mode()).toBe('preview');
    expect(source()).toBe('SPOTIFY_PREVIEW');

    // ...but the element's `play` event is what reports, and it reports the
    // server-resolved tier.
    const audio = api.getAudioElement()!;
    await act(async () => {
      audio.dispatchEvent(new Event('play'));
    });
    expect(reportPlaybackEvent).toHaveBeenCalledWith(
      expect.objectContaining({ songId: 'song-6', source: 'YOUTUBE', eventType: 'play' }),
    );
  });

  it('starts the fallback even when the embed had already reported a play', async () => {
    // The embed reported its play, then died. The user has already been counted
    // for this track, so the preview must not report a second time — but they
    // must not be left in silence either. Gating `audio.play()` on the report
    // flag conflated those two and silenced the fallback.
    getPlaybackSource.mockResolvedValue({
      source: 'YOUTUBE',
      youtubeVideoId: 'yt-abc',
      previewUrl: 'https://p.scdn.co/preview.mp3',
      song: { title: 'My Song' },
    });
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-8');
    });

    // The embed genuinely started.
    await act(async () => {
      api.handleYouTubePlay();
    });
    expect(reportPlaybackEvent).toHaveBeenCalledTimes(1);

    await act(async () => {
      api.handleYouTubeError();
    });

    // Playback continues...
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(api.isPlaying).toBe(true);

    // ...and the already-counted play is not double counted, even though the
    // preview element fires its own `play` event.
    const audio = api.getAudioElement()!;
    await act(async () => {
      audio.dispatchEvent(new Event('play'));
    });
    expect(reportPlaybackEvent).toHaveBeenCalledTimes(1);
  });

  it('a blocked play attempt reports nothing rather than a phantom play', async () => {
    // A play rejected by the browser fires no `play` event, so there is nothing
    // to report — which is the point of 2.24. Previously the tier selection had
    // already reported, so a track the user never heard still counted.
    getPlaybackSource.mockResolvedValue({
      source: 'AUDIO_URL',
      audioUrl: '/uploads/mysong.mp3',
      song: { title: 'My Song', artist: 'My Artist' },
    });
    // The autoplay policy refusing the request is the normal mobile path.
    HTMLMediaElement.prototype.play = vi
      .fn()
      .mockRejectedValue(new DOMException('autoplay blocked', 'NotAllowedError'));
    renderProvider();

    await act(async () => {
      await api.loadTrackBySongId('song-7');
    });
    expect(api.isPlaying).toBe(false);

    await act(async () => {
      await api.play().catch(() => undefined);
    });

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(reportPlaybackEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'play' }),
    );
    expect(api.isPlaying).toBe(false);
  });
});
