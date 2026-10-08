import React, { useCallback, useEffect } from 'react';
import { useAudioPlayer } from '../context/AudioContext';

interface SongPlayerProps {
  songId: string;
  title: string;
  artist: string;
}

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

/**
 * Minimal playback control for song pages. Auto-resolves the best available
 * source (own audio, else YouTube when enabled) and shows play/pause plus a
 * seekable progress bar. Replaces the legacy Spotify (SDK/preview) player.
 */
const SongPlayer: React.FC<SongPlayerProps> = ({ songId, title, artist }) => {
  const {
    currentSongId,
    setCurrentSongId,
    isPlaying,
    currentTime,
    duration,
    loading,
    playbackUnavailable,
    playbackMode,
    togglePlayPause,
    seek,
    loadTrackBySongId,
  } = useAudioPlayer();

  // Resolve the song's source while the page is open; replay is deduped by
  // AudioContext on the same song id.
  useEffect(() => {
    if (!songId) return;
    setCurrentSongId(songId);
    void loadTrackBySongId(songId, title, artist);
  }, [songId, title, artist, setCurrentSongId, loadTrackBySongId]);

  const isThisSong = currentSongId === songId;
  const thisMode = isThisSong ? playbackMode : 'none';

  const handleToggle = useCallback(() => {
    if (!isThisSong) {
      void loadTrackBySongId(songId, title, artist);
    }
    void togglePlayPause();
  }, [isThisSong, songId, title, artist, loadTrackBySongId, togglePlayPause]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const hasSource = thisMode === 'preview' || thisMode === 'youtube';

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isThisSong && (loading || playbackUnavailable)}
        className={`flex items-center justify-center w-11 h-11 rounded-full text-white transition-colors touch-manipulation ${hasSource ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700/80 text-gray-300'} ${isThisSong && (loading || playbackUnavailable) ? 'opacity-70 cursor-default' : ''}`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isThisSong && loading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : isThisSong && isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {isThisSong && playbackUnavailable && (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
          Preview unavailable
        </span>
      )}

      {(hasSource || (isThisSong && !playbackUnavailable)) && (
        <div className="hidden sm:flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-gray-400 w-10 text-right tabular-nums shrink-0">
            {hasSource && isPlaying ? formatTime(currentTime) : '0:00'}
          </span>
          <div
            onClick={handleSeek}
            className="w-32 lg:w-40 h-1.5 cursor-pointer rounded-full bg-gray-700 relative group"
            aria-label="Seek"
          >
            <div
              className="absolute left-0 top-0 h-1.5 rounded-full bg-green-500 transition-[width] duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>
          <span className="text-[11px] text-gray-400 w-10 tabular-nums shrink-0">
            {hasSource ? formatTime(duration) : '0:00'}
          </span>
        </div>
      )}
    </div>
  );
};

export default SongPlayer;