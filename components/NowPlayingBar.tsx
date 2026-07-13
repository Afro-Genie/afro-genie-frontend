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
    externalUrl,
    togglePlayPause,
    seek,
  } = useAudioPlayer();

  const webPlayback = useWebPlayback();

  if (!currentTrack || playbackMode === 'none') return null;

  const isEmbedMode = playbackMode === 'embed';

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
            {isEmbedMode ? (
              externalUrl ? (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1DB954] border border-[#1DB954]/30 rounded-full hover:bg-[#1DB954]/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Listen on Spotify
                </a>
              ) : null
            ) : (
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
            )}
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
          {isEmbedMode && (
            <span className="hidden lg:inline-flex items-center gap-1 rounded bg-[#1DB954]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1DB954]">
              Embed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
