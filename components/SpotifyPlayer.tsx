import React, { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useAudioPlayer } from '../context/AudioContext';
import { useWebPlayback } from '../context/WebPlaybackContext';
import { useAuth } from '../context/AuthContext';
import Waveform from './Waveform';

interface SpotifyPlayerProps {
  title: string;
  artist: string;
  spotifyId?: string | null;
  compact?: boolean;
}

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ title, artist, spotifyId, compact = false }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    loading,
    playbackMode,
    sdkPending,
    sdkPlaybackFailed,
    sdkPlaybackError,
    loadTrack,
    loadTrackById,
    togglePlayPause,
    seek,
    retryPlayback,
    retrySdkPlayback,
  } = useAudioPlayer();

  const { isSpotifyPremium, user } = useAuth();
  const webPlayback = useWebPlayback();
  const { sdkError } = webPlayback;
  const [loadingElapsed, setLoadingElapsed] = useState(0);

  useEffect(() => {
    if (spotifyId) {
      loadTrackById(spotifyId, title, artist);
    } else if (title && artist) {
      loadTrack(artist, title);
    }
  }, [title, artist, spotifyId, loadTrack, loadTrackById]);

  // Track how long we've been loading
  useEffect(() => {
    if (!loading) {
      setLoadingElapsed(0);
      return;
    }
    const start = Date.now();
    setLoadingElapsed(0);
    const id = setInterval(() => {
      setLoadingElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [loading]);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    seek(nextTime);
  };

  if (loading) {
    const wrapperClass = compact
      ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-3 w-full'
      : 'mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6 shadow-lg';

    const isSlow = loadingElapsed >= 5;
    const isVerySlow = loadingElapsed >= 12;

    return (
      <div
        className={wrapperClass}
        data-testid="spotify-player-loading"
        data-loading-elapsed={loadingElapsed}
        data-is-premium={isSpotifyPremium}
        data-sdk-ready={webPlayback.isReady}
        data-sdk-error={sdkError ?? ''}
        data-device-id={webPlayback.deviceId ?? ''}
      >
        <div className="mb-3">
          <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">{title}</h3>
          <p className="text-gray-300 text-xs md:text-sm truncate">{artist}</p>
        </div>

        {isVerySlow ? (
          <div className="space-y-2">
            <p className="text-[11px] text-yellow-400 leading-tight">
              Taking longer than expected.
            </p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {isSpotifyPremium
                ? 'Still waiting for the Spotify player to connect. This usually resolves within a few more seconds.'
                : 'This may be due to high demand on Spotify\'s servers. The player will connect automatically once ready.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-[11px] text-green-400 hover:text-green-300 underline transition-colors"
            >
              Refresh the page
            </button>
          </div>
        ) : isSlow ? (
          <div className="space-y-2">
            {isSpotifyPremium ? (
              <>
                <p className="text-[11px] text-green-400 leading-tight">
                  Connecting to Spotify player...
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  We're establishing a connection to stream the full track. This usually takes a few seconds.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-yellow-400 leading-tight">
                  Loading track information...
                </p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Fetching preview data from Spotify. If this persists, check your connection.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[11px] text-gray-400 leading-tight">Loading player...</p>
          </div>
        )}
      </div>
    );
  }

  const wrapperClass = compact
    ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-3 w-full'
    : 'mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6 shadow-lg';

  const trackName = currentTrack?.name ?? title;
  const trackArtist = currentTrack?.artistName ?? artist;
  const hasPreview = Boolean(currentTrack?.previewUrl);
  const isSdkMode = playbackMode === 'sdk';

  return (
    <div
      className={wrapperClass}
      data-testid="spotify-player-active"
      data-playback-mode={isSdkMode ? 'sdk' : 'preview'}
      data-is-premium={isSpotifyPremium}
      data-sdk-ready={webPlayback.isReady}
      data-device-id={webPlayback.deviceId ?? ''}
    >
      <div className="mb-3">
        <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">{trackName}</h3>
        <p className="text-gray-300 text-xs md:text-sm truncate">{trackArtist}</p>
      </div>

      {isSdkMode ? (
        <>
          {isSpotifyPremium && (
            <div className="mb-1">
              <span className="inline-flex items-center gap-1 rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                Full Track
              </span>
            </div>
          )}
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={webPlayback.previousTrack}
              className="rounded-md bg-gray-700 px-2 py-1.5 text-xs text-white hover:bg-gray-600 transition-colors"
              aria-label="Previous track"
            >
              &#9198;
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={webPlayback.nextTrack}
              className="rounded-md bg-gray-700 px-2 py-1.5 text-xs text-white hover:bg-gray-600 transition-colors"
              aria-label="Next track"
            >
              &#9197;
            </button>
            <span className="text-xs text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div
            onClick={handleSeek}
            className="relative h-2 w-full cursor-pointer rounded-full bg-gray-700"
            aria-label="Seek track"
          >
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-green-500 transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </>
      ) : !hasPreview ? (
        <div className="space-y-3">
          {user && isSpotifyPremium && sdkPlaybackFailed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-700/40">
                <span className="text-red-400 text-sm" aria-hidden="true">!</span>
              </div>
              <div>
                <p className="text-xs font-medium text-red-300">Full track playback failed</p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  {sdkPlaybackError || 'Could not start playback on Spotify.'}
                </p>
              </div>
            </div>
          )}

          {!(user && isSpotifyPremium && sdkPlaybackFailed) && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700/60">
                <span className="text-gray-400 text-sm" aria-hidden="true">&#9834;</span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-300">Playback unavailable</p>
                <p className="text-[11px] text-gray-500 leading-tight">
                  No audio preview or stream available for this track.
                </p>
              </div>
            </div>
          )}

          {user && isSpotifyPremium && sdkError && (
            <div className="rounded-md bg-red-900/20 border border-red-800/30 p-2 space-y-1">
              <p className="text-[11px] text-red-400 leading-tight font-medium">{sdkError}</p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Try signing out and signing back in, or check your Premium subscription.
              </p>
            </div>
          )}

          {user && isSpotifyPremium && sdkPlaybackFailed && !sdkError && (
            <div className="rounded-md bg-red-900/20 border border-red-800/30 p-2 space-y-1.5">
              <p className="text-[11px] text-red-400 leading-tight font-medium">
                {sdkPlaybackError || 'Spotify playback request failed.'}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Make sure Spotify is open and try again.
              </p>
              <button
                type="button"
                onClick={retrySdkPlayback}
                className="text-[11px] text-green-400 hover:text-green-300 leading-tight underline transition-colors"
              >
                Retry full track playback
              </button>
            </div>
          )}

          {user && isSpotifyPremium && !sdkError && !webPlayback.isReady && (
            <div className="rounded-md bg-green-900/20 border border-green-800/30 p-2">
              <p className="text-[11px] text-green-400 leading-tight">
                {sdkPending
                  ? 'Waiting for Spotify player to connect — full track playback will start automatically.'
                  : 'Connecting to Spotify player — full track playback will activate once ready.'}
              </p>
            </div>
          )}

          {user && isSpotifyPremium && !sdkError && webPlayback.isReady && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-gray-500 leading-tight">
                Full track streaming is not available for this song on Spotify.
              </p>
              <button
                type="button"
                onClick={retryPlayback}
                className="text-[11px] text-gray-400 hover:text-gray-300 leading-tight underline transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {user && !isSpotifyPremium && (
            <div className="rounded-md bg-gray-700/30 border border-gray-600/30 p-2 space-y-1.5">
              <p className="text-[11px] text-gray-400 leading-tight">
                Spotify previews are not available for this track. Connect Spotify Premium to stream full tracks.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('spotify-link-dialog:open'))}
                className="text-[11px] text-green-400 hover:text-green-300 leading-tight underline transition-colors"
              >
                Connect Spotify Premium
              </button>
            </div>
          )}

          {!user && (
            <div className="rounded-md bg-gray-700/30 border border-gray-600/30 p-2 space-y-1.5">
              <p className="text-[11px] text-gray-400 leading-tight">
                Sign in to access full playback and track previews.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('login-modal:open'))}
                className="text-[11px] text-green-400 hover:text-green-300 leading-tight underline transition-colors"
              >
                Sign in with Spotify
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500 transition-colors"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-xs text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {compact ? (
            <div
              onClick={handleSeek}
              className="relative h-2 w-full cursor-pointer rounded-full bg-gray-700"
              aria-label="Seek track preview"
            >
              <div
                className="absolute left-0 top-0 h-2 rounded-full bg-green-500 transition-[width] duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : (
            <div className="mb-2 cursor-pointer" onClick={handleSeek}>
              <Waveform height={48} barWidth={2} barGap={1} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;
