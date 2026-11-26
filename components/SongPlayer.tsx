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

  useEffect(() => {
    if (!songId) return;
    setCurrentSongId(songId);
    void loadTrackBySongId(songId, title, artist);
  }, [songId, title, artist, setCurrentSongId, loadTrackBySongId]);

  const isThisSong = currentSongId === songId;
  const thisMode = isThisSong ? playbackMode : 'none';
  const hasSource = thisMode === 'preview' || thisMode === 'youtube';
  const isUnavailable = isThisSong && playbackUnavailable;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleToggle = useCallback(() => {
    if (!isThisSong) void loadTrackBySongId(songId, title, artist);
    void togglePlayPause();
  }, [isThisSong, songId, title, artist, loadTrackBySongId, togglePlayPause]);

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(event.target.value));
  };

  const skip = (seconds: number) => {
    if (duration > 0) seek(Math.min(duration, Math.max(0, currentTime + seconds)));
  };

  return (
    <section aria-label="Audio player" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200/75 sm:text-[11px] sm:tracking-[0.2em]">
          <span className={`flex h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.95)]' : 'bg-emerald-400/60'}`} />
          {isUnavailable ? 'Audio preview unavailable' : loading ? 'Finding your track' : isPlaying ? 'Now playing' : 'Ready to play'}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
          {[12, 20, 15, 25, 14, 22, 10, 17, 24, 13, 19, 11].map((height, index) => (
            <span
              key={index}
              className={`w-1 rounded-full bg-emerald-300/80 ${isPlaying ? 'animate-pulse' : ''}`}
              style={{ height: `${height}px`, animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-white/50">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step="0.1"
          value={duration > 0 ? Math.min(currentTime, duration) : 0}
          onChange={handleSeek}
          disabled={!hasSource || duration <= 0}
          aria-label="Track progress"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: `linear-gradient(to right, #6ee7b7 ${progress}%, rgba(255,255,255,0.12) ${progress}%)` }}
        />
        <span className="w-10 shrink-0 font-mono text-xs tabular-nums text-white/50">{formatTime(duration)}</span>
      </div>

      <div className="mt-4 flex items-center justify-center gap-7">
        <button
          type="button"
          onClick={() => skip(-10)}
          disabled={!hasSource || duration <= 0}
          aria-label="Seek backward 10 seconds"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m0-8-2 2m2-2 2 2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isThisSong && (loading || playbackUnavailable)}
          aria-label={loading && isThisSong ? 'Loading audio' : isPlaying ? 'Pause track' : 'Play track'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300 text-[#092017] shadow-[0_0_28px_rgba(110,231,183,0.32)] transition hover:scale-105 hover:bg-emerald-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          {loading && isThisSong ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : isPlaying ? (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z" /></svg>
          ) : (
            <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          disabled={!hasSource || duration <= 0}
          aria-label="Seek forward 10 seconds"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-2.64-6.36L21 8m0-5v5h-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m0-8-2 2m2-2 2 2" />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default SongPlayer;
