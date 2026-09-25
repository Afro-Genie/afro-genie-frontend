import React, { useEffect, useRef, useState } from 'react';

export interface LegacyPreviewPlayerProps {
  /** 30-second Spotify preview URL (Tier 3 fallback). */
  previewUrl: string;
  title?: string;
  artist?: string;
  coverImageUrl?: string | null;
  autoPlay?: boolean;
  showControls?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const formatTime = (seconds: number): string => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Tier 3 playback: 30-second Spotify preview. No authentication or Premium
 * subscription required. Retained as a fallback when neither own-uploaded audio
 * nor a YouTube match is available.
 */
const LegacyPreviewPlayer: React.FC<LegacyPreviewPlayerProps> = ({
  previewUrl,
  title,
  artist,
  coverImageUrl,
  autoPlay = false,
  showControls = true,
  onPlay,
  onPause,
  onEnd,
  onTimeUpdate,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime, audio.duration || 0);
    };
    const handleMeta = () => setDuration(audio.duration || 0);
    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };
    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };
    const handleEnded = () => {
      setIsPlaying(false);
      onEnd?.();
    };

    audio.addEventListener('timeupdate', handleTime);
    audio.addEventListener('loadedmetadata', handleMeta);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTime);
      audio.removeEventListener('loadedmetadata', handleMeta);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onEnd, onTimeUpdate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = previewUrl;
    audio.load();
    if (autoPlay) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [previewUrl, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      {showControls && (
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/40">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={title ?? 'Cover art'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            {title && <p className="text-sm font-semibold text-white truncate">{title}</p>}
            {artist && <p className="text-xs text-gray-300 truncate">{artist}</p>}
            <p className="text-[10px] uppercase tracking-wide text-amber-400/80 mt-1">30s preview</p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-full bg-green-600 hover:bg-green-500 text-white"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <span className="text-[11px] text-gray-300 tabular-nums w-9 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-600 relative">
                <div
                  className="absolute left-0 top-0 h-1.5 rounded-full bg-green-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-300 tabular-nums w-9">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegacyPreviewPlayer;
