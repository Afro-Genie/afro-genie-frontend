import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface YouTubePlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  load: (videoId: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  /** Render the built-in artwork + custom controls overlay. */
  showControls?: boolean;
  coverImageUrl?: string | null;
  title?: string;
  artist?: string;
  volume?: number;
  onReady?: (handle: YouTubePlayerHandle) => void;
  onStateChange?: (state: YouTubePlaybackState) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (code: number) => void;
  className?: string;
}

let apiPromise: Promise<void> | null = null;

const SCRIPT_ID = 'youtube-iframe-api';

const ensureYouTubeApi = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    if (document.getElementById(SCRIPT_ID)) {
      // Script tag exists but the API is not ready yet — the callback will fire.
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load the YouTube IFrame API'));
    document.head.appendChild(script);
  });

  return apiPromise;
};

const formatTime = (seconds: number): string => {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      videoId,
      autoplay = true,
      showControls = false,
      coverImageUrl,
      title,
      artist,
      volume = 0.8,
      onReady,
      onStateChange,
      onPlay,
      onPause,
      onEnd,
      onTimeUpdate,
      onError,
      className,
    },
    ref,
  ) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YT.Player | null>(null);
    const mountedRef = useRef(false);
    const timeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callbacksRef = useRef({ onReady, onStateChange, onPlay, onPause, onEnd, onTimeUpdate, onError });
    callbacksRef.current = { onReady, onStateChange, onPlay, onPause, onEnd, onTimeUpdate, onError };

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [internalVolume, setInternalVolume] = useState(volume);
    const [error, setError] = useState<string | null>(null);

    const emitState = useCallback(() => {
      const player = playerRef.current;
      if (!player) return;
      const time = player.getCurrentTime?.() ?? 0;
      const dur = player.getDuration?.() ?? 0;
      const playing = player.getPlayerState?.() === YT.PlayerState.PLAYING;
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
      callbacksRef.current.onStateChange?.({ isPlaying: playing, currentTime: time, duration: dur });
      callbacksRef.current.onTimeUpdate?.(time, dur);
    }, []);

    const clearTimer = useCallback(() => {
      if (timeTimerRef.current) {
        clearInterval(timeTimerRef.current);
        timeTimerRef.current = null;
      }
    }, []);

    const startTimer = useCallback(() => {
      clearTimer();
      timeTimerRef.current = setInterval(emitState, 500);
    }, [clearTimer, emitState]);

    const handle: YouTubePlayerHandle = {
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      seek: (seconds: number) => playerRef.current?.seekTo?.(seconds, true),
      setVolume: (v: number) => {
        const clamped = Math.min(1, Math.max(0, v));
        setInternalVolume(clamped);
        playerRef.current?.setVolume?.(Math.round(clamped * 100));
      },
      load: (id: string) => playerRef.current?.loadVideoById?.(id),
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    };

    // Create the player once the API is available.
    useEffect(() => {
      mountedRef.current = true;
      let destroyed = false;

      ensureYouTubeApi()
        .then(() => {
          if (destroyed || !mountedRef.current || !hostRef.current || playerRef.current) return;

          playerRef.current = new window.YT!.Player(hostRef.current, {
            videoId,
            width: '200',
            height: '200',
            playerVars: {
              autoplay: autoplay ? 1 : 0,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                event.target.setVolume(Math.round(internalVolume * 100));
                callbacksRef.current.onReady?.(handle);
                if (autoplay) {
                  event.target.playVideo();
                }
              },
              onStateChange: (event) => {
                const playing = event.data === YT.PlayerState.PLAYING;
                setIsPlaying(playing);
                if (playing) {
                  startTimer();
                  callbacksRef.current.onPlay?.();
                } else {
                  clearTimer();
                  callbacksRef.current.onPause?.();
                }
                if (event.data === YT.PlayerState.ENDED) {
                  clearTimer();
                  emitState();
                  callbacksRef.current.onEnd?.();
                }
              },
              onError: (event) => {
                clearTimer();
                setIsPlaying(false);
                setError('This track is unavailable on YouTube.');
                callbacksRef.current.onError?.(event.data);
              },
            },
          });
        })
        .catch(() => {
          setError('Playback is unavailable right now.');
        });

      return () => {
        destroyed = true;
        mountedRef.current = false;
        clearTimer();
        playerRef.current?.destroy?.();
        playerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Swap the video without recreating the player.
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      const current = player.getVideoData?.()?.video_id;
      if (current && current === videoId) return;
      player.loadVideoById?.(videoId);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(autoplay);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    useImperativeHandle(ref, () => handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    const togglePlay = () => {
      if (isPlaying) {
        handle.pause();
      } else {
        handle.play();
      }
    };

    const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      handle.seek(ratio * duration);
      setCurrentTime(ratio * duration);
    };

    return (
      <div className={className}>
        {/* Hidden iframe host — audio-only experience. */}
        <div
          className="overflow-hidden"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        >
          <div ref={hostRef} />
        </div>

        {showControls && (
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/40">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt={title ?? 'Cover art'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-900/40 to-gray-900" />
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              {error ? (
                <p className="text-sm text-red-300">{error}</p>
              ) : (
                <>
                  {title && <p className="text-sm font-semibold text-white truncate">{title}</p>}
                  {artist && <p className="text-xs text-gray-300 truncate">{artist}</p>}

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
                    <div
                      onClick={onSeekClick}
                      className="flex-1 h-1.5 cursor-pointer rounded-full bg-gray-600 relative"
                    >
                      <div
                        className="absolute left-0 top-0 h-1.5 rounded-full bg-green-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-300 tabular-nums w-9">
                      {formatTime(duration)}
                    </span>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={internalVolume}
                      onChange={(e) => handle.setVolume(Number(e.target.value))}
                      className="w-16 accent-green-500"
                      aria-label="Volume"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

YouTubePlayer.displayName = 'YouTubePlayer';

export default YouTubePlayer;
