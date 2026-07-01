import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { spotifyService, type SpotifyTrackSummary } from '../services/spotifyService';

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
  const [spotifyTrack, setSpotifyTrack] = useState<SpotifyTrackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const searchTrack = async () => {
      if (!title || !artist) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const track = await spotifyService.searchBestTrackSummary(artist, title, {
          requirePreview: true
        });

        if (track) {
          setSpotifyTrack(track);
        } else {
          setError('Track not found on Spotify');
        }
      } catch (err: any) {
        console.error('Error searching for Spotify track:', err);
        // Don't show error if credentials are not configured
        if (err.message?.includes('credentials not configured')) {
          setError(null); // Silently fail if credentials aren't set up
        } else {
          setError('Unable to load Spotify player');
        }
      } finally {
        setLoading(false);
      }
    };

    searchTrack();
  }, [title, artist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    audio.pause();
    audio.currentTime = 0;

    if (spotifyTrack?.previewUrl) {
      audio.src = spotifyTrack.previewUrl;
      audio.load();
    } else {
      audio.src = '';
    }
  }, [spotifyTrack?.previewUrl]);

  const progressPercent = useMemo(() => {
    if (!duration || duration <= 0) {
      return 0;
    }

    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !spotifyTrack?.previewUrl) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const nextTime = ratio * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (loading) {
    return null;
  }

  if (error || !spotifyTrack) {
    return (
      <div className={compact ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-3 w-full md:w-[280px]' : 'mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6 shadow-lg'}>
        <div className="mb-2">
          <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">{title}</h3>
          <p className="text-gray-300 text-xs md:text-sm truncate">{artist}</p>
        </div>
        <p className="text-sm text-gray-400">Preview unavailable</p>
      </div>
    );
  }

  const wrapperClass = compact
    ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-3 w-full md:w-[280px]'
    : 'mb-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4 md:p-6 shadow-lg';

  return (
    <div className={wrapperClass}>
      <audio
        ref={audioRef}
        src={spotifyTrack.previewUrl ?? undefined}
        preload="metadata"
        crossOrigin="anonymous"
      >
        <source src={spotifyTrack.previewUrl ?? undefined} type="audio/mpeg" />
      </audio>

      <div className="mb-4">
        <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">{spotifyTrack.name}</h3>
        <p className="text-gray-300 text-xs md:text-sm truncate">{spotifyTrack.artistName}</p>
      </div>

      {!spotifyTrack.previewUrl ? (
        <p className="text-sm text-gray-400">Preview unavailable</p>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="text-xs text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div
            onClick={seek}
            className="relative h-2 w-full cursor-pointer rounded-full bg-gray-700"
            aria-label="Seek track preview"
          >
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-green-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SpotifyPlayer;

