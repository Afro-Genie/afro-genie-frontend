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
    loadTrack,
    loadTrackById,
    togglePlayPause,
    seek,
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
      <div className={wrapperClass}>
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
              This may be due to high demand on Spotify's servers. The player will connect automatically once ready.
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
    <div className={wrapperClass}>
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-400 cursor-not-allowed"
            >
              Play
            </button>
          </div>
          {user && isSpotifyPremium && sdkError && (
            <div className="space-y-1">
              <p className="text-[11px] text-red-400 leading-tight">{sdkError}</p>
              <p className="text-[11px] text-gray-500 leading-tight">
                Try signing out and signing back in with Spotify, or check your Premium subscription.
              </p>
            </div>
          )}
          {user && isSpotifyPremium && !sdkError && !webPlayback.isReady && (
            <p className="text-[11px] text-green-400 leading-tight">
              Connecting to Spotify player...
            </p>
          )}
          {user && isSpotifyPremium && !sdkError && webPlayback.isReady && (
            <p className="text-[11px] text-gray-500 leading-tight">
              Full track unavailable for this song
            </p>
          )}
          {user && !isSpotifyPremium && (
            <>
              <p className="text-[11px] text-gray-500 leading-tight">
                Preview unavailable for this track
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('spotify-link-dialog:open'))}
                className="text-[11px] text-green-400 hover:text-green-300 leading-tight underline transition-colors"
              >
                Connect Spotify Premium for full playback
              </button>
            </>
          )}
          {!user && (
            <>
              <p className="text-[11px] text-gray-500 leading-tight">
                Preview unavailable for this track
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('login-modal:open'))}
                className="text-[11px] text-green-400 hover:text-green-300 leading-tight underline transition-colors"
              >
                Sign in with Spotify to play full tracks
              </button>
            </>
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
