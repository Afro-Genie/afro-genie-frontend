import React from 'react';
import { useAudioPlayer } from '../context/AudioContext';
import { useWebPlayback } from '../context/WebPlaybackContext';

const formatTime = (seconds: number) => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = Math.floor(safe % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

export default function NowPlayingBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    playbackMode,
    togglePlayPause,
    seek,
  } = useAudioPlayer();

  const webPlayback = useWebPlayback();

  if (!currentTrack || playbackMode === 'none') return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a2b22]/95 backdrop-blur-sm border-t border-white/10">
      <div className="container mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center gap-3 h-14 sm:h-16">
          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentTrack.name}</p>
            <p className="text-xs text-gray-400 truncate">{currentTrack.artistName}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <>
              {playbackMode === 'sdk' && (
                <button
                  type="button"
                  onClick={webPlayback.previousTrack}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Previous"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={togglePlayPause}
                className="p-2 rounded-full bg-green-600 hover:bg-green-500 text-white transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {playbackMode === 'sdk' && (
                <button
                  type="button"
                  onClick={webPlayback.nextTrack}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  aria-label="Next"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.034 12 8 14.14V9.86zM16 6h2v12h-2V6z" />
                  </svg>
                </button>
              )}
            </>
          </div>

          {/* Time + progress (desktop only) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[11px] text-gray-400 w-10 text-right tabular-nums">
              {formatTime(currentTime)}
            </span>
            <div
              onClick={handleSeek}
              className="flex-1 h-1.5 cursor-pointer rounded-full bg-gray-700 relative group"
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
            <span className="text-[11px] text-gray-400 w-10 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Mode badge */}
          {playbackMode === 'sdk' && (
            <span className="hidden lg:inline-flex items-center gap-1 rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
              Full Track
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
