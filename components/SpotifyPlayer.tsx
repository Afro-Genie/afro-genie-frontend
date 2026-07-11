import React, { useEffect, useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useAudioPlayer } from '../context/AudioContext';
import Waveform from './Waveform';

interface SpotifyPlayerProps {
  title: string;
  artist: string;
  compact?: boolean;
}

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ title, artist, compact = false }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    loading,
    loadTrack,
    togglePlayPause,
    seek,
  } = useAudioPlayer();

  useEffect(() => {
    if (title && artist) {
      loadTrack(artist, title);
    }
  }, [title, artist, loadTrack]);

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
    ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-3 w-full md:w-[280px]'
    : 'mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6 shadow-lg';

  const trackName = currentTrack?.name ?? title;
  const trackArtist = currentTrack?.artistName ?? artist;
  const spotifyId = currentTrack?.id;
  const hasPreview = Boolean(currentTrack?.previewUrl);

  return (
    <div className={wrapperClass}>
      <div className="mb-3">
        <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">{trackName}</h3>
        <p className="text-gray-300 text-xs md:text-sm truncate">{trackArtist}</p>
      </div>

      {!hasPreview ? (
        <div className="space-y-2">
          {spotifyId ? (
            <iframe
              title={`Spotify preview: ${trackName}`}
              src={`https://open.spotify.com/embed/track/${spotifyId}?theme=0&comma=true`}
              width="100%"
              height={compact ? 80 : 152}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-md"
            />
          ) : (
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Listen on Spotify
            </a>
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
