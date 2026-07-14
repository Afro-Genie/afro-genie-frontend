import React, { useEffect, useMemo } from 'react';
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

  const { isSpotifyPremium } = useAuth();
  const webPlayback = useWebPlayback();

  useEffect(() => {
    if (spotifyId) {
      loadTrackById(spotifyId, title, artist);
    } else if (title && artist) {
      loadTrack(artist, title);
    }
  }, [title, artist, spotifyId, loadTrack, loadTrackById]);

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
    return null;
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
          <p className="text-[11px] text-gray-500 leading-tight">
            Preview unavailable for this track
          </p>
          {!isSdkMode && isSpotifyPremium && (
            <p className="text-[11px] text-green-400 leading-tight">
              Connecting to Spotify player...
            </p>
          )}
          {!isSpotifyPremium && (
            <p className="text-[11px] text-gray-400 leading-tight">
              Sign in with Spotify for full playback
            </p>
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
