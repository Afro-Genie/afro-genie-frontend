import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toMediaUrl } from '../lib/apiBase';
import { playbackApi, type PlaybackSourceKind, type PlaybackEventType } from '../services/playbackService';
import { featureFlags } from '../config/featureFlags';

type PlaybackMode = 'preview' | 'youtube' | 'none';

/** Imperative controller exposed by the mounted YouTube player. */
export interface YouTubeController {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

export interface YouTubePlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

/** Minimal track metadata the audio engine needs for its own UI. */
export interface CurrentTrack {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string | null;
  durationMs: number;
  audioUrl?: string | null;
}

interface AudioState {
  currentTrack: CurrentTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  playbackMode: PlaybackMode;
  /** Resolved source tier for the current track. */
  playbackSource: PlaybackSourceKind | null;
  /** YouTube video id when playbackMode === 'youtube'. */
  youtubeVideoId: string | null;
  /** Increments whenever the current track finishes — used by the queue to advance. */
  trackEndedCount: number;
  /** True when the server resolved no playable source for the requested song.
   *  Set only when the catalog row itself has nothing to play, so the UI can say
   *  "preview unavailable" instead of silently rendering nothing. */
  playbackUnavailable: boolean;
}

interface AudioContextValue extends AudioState {
  /** Load an AfroGenie DB song (e.g. an artist's uploaded release) and play its audio. */
  loadTrackBySongId: (songId: string, title?: string, artist?: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
  currentSongId: string | null;
  setCurrentSongId: (id: string | null) => void;
  /** Called by <PlaybackManager> when the YouTube iframe player is ready. */
  registerYouTubeController: (controller: YouTubeController | null) => void;
  /** Called by <PlaybackManager> as the YouTube player state changes. */
  reportYouTubeState: (state: YouTubePlaybackState) => void;
  /** Called by <PlaybackManager> when the YouTube player reaches the end. */
  handleYouTubeEnded: () => void;
  /** Called by <PlaybackManager> when the YouTube embed errors. */
  handleYouTubeError: () => void;
  /** Called by <PlaybackManager> when the YouTube embed actually starts playing. */
  handleYouTubePlay: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function useAudioPlayer(): AudioContextValue {
  const ctx = useContext(AudioContext);
  if (!ctx) {
    throw new Error('useAudioPlayer must be used within an AudioProvider');
  }
  return ctx;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('none');
  const playbackModeRef = useRef<PlaybackMode>('none');
  const [playbackUnavailable, setPlaybackUnavailable] = useState(false);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [playbackSource, setPlaybackSource] = useState<PlaybackSourceKind | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [trackEndedCount, setTrackEndedCount] = useState(0);
  const lastKeyRef = useRef<string>('');
  const ytControllerRef = useRef<YouTubeController | null>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const playbackSourceRef = useRef<PlaybackSourceKind | null>(null);
  const currentTimeRef = useRef(0);

  // Keep refs in sync so event reporting never reads stale state.
  useEffect(() => { currentSongIdRef.current = currentSongId; }, [currentSongId]);
  useEffect(() => { playbackSourceRef.current = playbackSource; }, [playbackSource]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);

  const reportEvent = useCallback((eventType: PlaybackEventType) => {
    const songId = currentSongIdRef.current;
    const source = playbackSourceRef.current;
    if (!songId || !source || songId.startsWith('spotify:')) return;
    void playbackApi.reportPlaybackEvent({
      songId,
      source,
      eventType,
      positionMs: Math.round(currentTimeRef.current * 1000),
    });
  }, []);

  /**
   * 2.24 / M-6 — `play` must mean "playback actually started", not "a source was
   * selected". It used to be reported the moment a source tier was chosen: after
   * `audio.load()` but before `audio.play()`, and for YouTube before the embed
   * existed at all. A track that was never actually played still produced a
   * `play` row, and a play that then failed (blocked autoplay, geo/embed error)
   * left the same phantom row behind with nothing to retract it.
   *
   * Reporting is now driven by the media element's own `play` event and by the
   * YouTube embed's `onPlay`, and is gated so a track reports at most one
   * `play` however many times it is paused and resumed. That preserves the
   * previous one-per-track volume while making it truthful.
   */
  const playReportedRef = useRef(false);
  const reportPlayOnce = useCallback(() => {
    if (playReportedRef.current) return;
    playReportedRef.current = true;
    reportEvent('play');
  }, [reportEvent]);

  const registerYouTubeController = useCallback((controller: YouTubeController | null) => {
    ytControllerRef.current = controller;
  }, []);

  const reportYouTubeState = useCallback((state: YouTubePlaybackState) => {
    setIsPlaying(state.isPlaying);
    setCurrentTime(state.currentTime);
    setDuration(state.duration);
  }, []);

  const handleYouTubeEnded = useCallback(() => {
    setIsPlaying(false);
    setTrackEndedCount((c) => c + 1);
    reportEvent('complete');
  }, [reportEvent]);

  /**
   * The embed genuinely started playing. This is the only trustworthy `play`
   * signal for the YouTube tier — `setYoutubeVideoId` merely schedules a mount.
   */
  const handleYouTubePlay = useCallback(() => {
    setIsPlaying(true);
    reportPlayOnce();
  }, [reportPlayOnce]);

  /** Called by <PlaybackManager> when the YouTube embed errors (blocked/geo).
   *  There is no fallback tier any more — surface the failure instead of
   *  leaving the user in silence. */
  const handleYouTubeError = useCallback(() => {
    setPlaybackMode('none');
    playbackModeRef.current = 'none';
    setYoutubeVideoId(null);
    setIsPlaying(false);
    setPlaybackUnavailable(true);
  }, []);

  // Initialize <audio> element for own-audio path — created once, never rebuilt
  // on mode changes, otherwise listeners/src assigned mid-flow get discarded.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (playbackModeRef.current === 'preview') {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (playbackModeRef.current === 'preview') {
        setDuration(audio.duration || 0);
      }
    };
    const onEnded = () => {
      if (playbackModeRef.current === 'preview') {
        setIsPlaying(false);
        setTrackEndedCount((c) => c + 1);
        reportEvent('complete');
      }
    };
    // The element's own `play` event is the first moment playback is real, so
    // this — not the `audio.load()` that precedes it — is where `play` is
    // reported. It also covers the paths that start the element without going
    // through source selection: a pause/resume in `togglePlayPause`. A play
    // attempt rejected by the browser fires no event, so a blocked autoplay
    // reports nothing rather than a phantom play (2.24 / M-6).
    const onPlay = () => {
      if (playbackModeRef.current !== 'preview') return;
      setIsPlaying(true);
      reportPlayOnce();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.pause();
      audio.src = '';
    };
  }, [reportEvent, reportPlayOnce]);

  const loadTrackBySongId = useCallback(async (songId: string, title?: string, artist?: string) => {
    const key = `db::${songId}`;
    if (key === lastKeyRef.current) return;

    // Report the previous track as skipped before switching.
    if (currentSongIdRef.current && currentSongIdRef.current !== songId) {
      reportEvent('skip');
    }

    lastKeyRef.current = key;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = '';
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setPlaybackUnavailable(false);
    setYoutubeVideoId(null);
    ytControllerRef.current = null;
    setCurrentSongId(songId);
    currentSongIdRef.current = songId;
    currentTimeRef.current = 0;

    try {
      const src = await playbackApi.getPlaybackSource(songId);
      const meta = src.song;

      const baseTrack: CurrentTrack = {
        id: songId,
        name: title || meta?.title || 'Unknown Track',
        artistName: artist || meta?.artist || 'Unknown Artist',
        imageUrl: meta?.coverImageUrl ?? null,
        durationMs: meta?.durationMs ?? 0,
        audioUrl: null,
      };

      setPlaybackSource(src.source);
      playbackSourceRef.current = src.source;

      // A new track: re-arm the `play` gate. The event itself is emitted later,
      // by the media element's `play` event or the embed's `onPlay`, so a source
      // that is selected but never actually played reports nothing (2.24 / M-6).
      playReportedRef.current = false;

      // Tier 1: own uploaded audio
      if (src.source === 'AUDIO_URL' && src.audioUrl) {
        const url = toMediaUrl(src.audioUrl);
        setCurrentTrack({ ...baseTrack, audioUrl: url });
        setPlaybackMode('preview');
        playbackModeRef.current = 'preview';
        audio.src = url;
        audio.load();
        return;
      }

      // Tier 2: YouTube (audio-only iframe)
      if (src.source === 'YOUTUBE' && src.youtubeVideoId && featureFlags.youtubePlayback) {
        setCurrentTrack(baseTrack);
        setPlaybackMode('youtube');
        playbackModeRef.current = 'youtube';
        setYoutubeVideoId(src.youtubeVideoId);
        return;
      }

      // Tier 4: the catalog row has no audio of its own. Surface it instead of
      // leaving the UI blank.
      setCurrentTrack(baseTrack);
      setPlaybackMode('none');
      setPlaybackUnavailable(true);
    } catch {
      lastKeyRef.current = '';
      setCurrentTrack(null);
      setPlaybackMode('none');
      setPlaybackUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [reportEvent]);

  const togglePlayPause = useCallback(async () => {
    if (playbackMode === 'none') return;

    if (playbackMode === 'youtube') {
      if (isPlaying) {
        ytControllerRef.current?.pause();
        setIsPlaying(false);
        reportEvent('pause');
      } else {
        ytControllerRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio || !currentTrack?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      reportEvent('pause');
    } else {
      try {
        // No `reportEvent('play')` here on purpose: the element's own `play`
        // event reports it, which is also why a rejected attempt (blocked
        // autoplay) reports nothing instead of a phantom play (2.24 / M-6).
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [playbackMode, isPlaying, currentTrack?.audioUrl, reportEvent]);

  const play = useCallback(async () => {
    if (!isPlaying) {
      await togglePlayPause();
    }
  }, [isPlaying, togglePlayPause]);

  const pause = useCallback(() => {
    if (isPlaying) {
      togglePlayPause();
    }
  }, [isPlaying, togglePlayPause]);

  const seek = useCallback((time: number) => {
    if (playbackMode === 'none') return;

    if (playbackMode === 'youtube') {
      setCurrentTime(time);
      ytControllerRef.current?.seek(time);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, [playbackMode]);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      loading,
      playbackMode,
      playbackSource,
      youtubeVideoId,
      trackEndedCount,
      playbackUnavailable,
      loadTrackBySongId,
      togglePlayPause,
      play,
      pause,
      seek,
      getAudioElement,
      currentSongId,
      setCurrentSongId,
      registerYouTubeController,
      reportYouTubeState,
      handleYouTubeEnded,
      handleYouTubeError,
      handleYouTubePlay,
    }),
    [currentTrack, isPlaying, currentTime, duration, loading, playbackMode, playbackSource, youtubeVideoId, trackEndedCount, play, pause, seek, togglePlayPause, getAudioElement, currentSongId, setCurrentSongId, registerYouTubeController, reportYouTubeState, handleYouTubeEnded, handleYouTubeError, handleYouTubePlay, playbackUnavailable, loadTrackBySongId],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}