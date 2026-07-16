import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { spotifyService, type SpotifyTrackSummary } from '../services/spotifyService';
import { useWebPlayback } from './WebPlaybackContext';
import { useAuth } from './AuthContext';

type PlaybackMode = 'preview' | 'sdk' | 'none';

interface AudioState {
  currentTrack: SpotifyTrackSummary | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
  playbackMode: PlaybackMode;
  /** True when a Premium user has attempted playback but SDK was not yet ready.
   *  The app should show a "connecting" state and auto-switch when SDK becomes ready. */
  sdkPending: boolean;
  /** True when SDK playback request failed (device offline, 403, etc.). */
  sdkPlaybackFailed: boolean;
  /** Error message from a failed SDK playback attempt. */
  sdkPlaybackError: string | null;
}

interface AudioContextValue extends AudioState {
  loadTrack: (artist: string, title: string) => Promise<void>;
  loadTrackById: (spotifyId: string, title?: string, artist?: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  retryPlayback: () => void;
  /** Retry SDK playback after a failure (e.g. device came back online). */
  retrySdkPlayback: () => void;
  getAudioElement: () => HTMLAudioElement | null;
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
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrackSummary | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('none');
  const [sdkPending, setSdkPending] = useState(false);
  const [sdkPlaybackFailed, setSdkPlaybackFailed] = useState(false);
  const [sdkPlaybackError, setSdkPlaybackError] = useState<string | null>(null);
  const lastKeyRef = useRef<string>('');
  const lastAttemptedTrackRef = useRef<{ id: string; title?: string; artist?: string } | null>(null);
  const intentionalPlayRef = useRef<boolean>(false);
  const { isSpotifyPremium } = useAuth();
  const webPlayback = useWebPlayback();

  // Sync state from WebPlayback when in SDK mode
  useEffect(() => {
    if (playbackMode !== 'sdk') return;
    setIsPlaying(webPlayback.isPlaying);
    setCurrentTime(webPlayback.currentTime / 1000);
    setDuration(webPlayback.duration / 1000);
  }, [playbackMode, webPlayback.isPlaying, webPlayback.currentTime, webPlayback.duration]);

  // Sync currentTrack metadata from SDK state so AudioContext knows what's actually playing.
  // This prevents stale URI usage when the SDK handles next/prev internally.
  useEffect(() => {
    if (playbackMode !== 'sdk') return;
    if (webPlayback.currentTrackUri && currentTrack?.spotifyUri !== webPlayback.currentTrackUri) {
      setCurrentTrack((prev) => ({
        id: webPlayback.currentTrackUri!.replace('spotify:track:', ''),
        name: webPlayback.currentTrackName || prev?.name || 'Unknown Track',
        artistName: webPlayback.currentTrackArtist || prev?.artistName || 'Unknown Artist',
        albumName: prev?.albumName ?? null,
        imageUrl: prev?.imageUrl ?? null,
        previewUrl: prev?.previewUrl ?? null,
        spotifyUri: webPlayback.currentTrackUri!,
        durationMs: webPlayback.duration,
        externalUrl: prev?.externalUrl ?? null,
      }));
    }
  }, [playbackMode, webPlayback.currentTrackUri, webPlayback.currentTrackName, webPlayback.currentTrackArtist, webPlayback.duration, currentTrack?.spotifyUri]);

  // When SDK becomes ready for a Premium user stuck in 'none' mode, auto-switch to SDK
  // and retry playback for the last attempted track.
  useEffect(() => {
    if (!isSpotifyPremium || !webPlayback.isReady) return;

    if (playbackMode === 'none' && sdkPending) {
      const last = lastAttemptedTrackRef.current;
      if (last?.id) {
        const uri = `spotify:track:${last.id}`;
        setPlaybackMode('sdk');
        setSdkPending(false);
        setSdkPlaybackFailed(false);
        setSdkPlaybackError(null);
        setCurrentTrack({
          id: last.id,
          name: last.title || 'Unknown Track',
          artistName: last.artist || 'Unknown Artist',
          albumName: null,
          imageUrl: null,
          previewUrl: null,
          spotifyUri: uri,
          durationMs: 0,
          externalUrl: null,
        });
        intentionalPlayRef.current = true;
        webPlayback.playTrack(uri).then((sdkOk) => {
          if (!sdkOk) {
            // SDK play failed on retry — go back to none so UI shows failure state
            setPlaybackMode('none');
            setSdkPlaybackFailed(true);
          }
        });
      }
    }
  }, [isSpotifyPremium, webPlayback.isReady, playbackMode, sdkPending, webPlayback.playTrack]);

  // Initialize <audio> element for preview path
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (playbackMode === 'preview') {
        setCurrentTime(audio.currentTime);
      }
    };
    const onLoadedMetadata = () => {
      if (playbackMode === 'preview') {
        setDuration(audio.duration || 0);
      }
    };
    const onEnded = () => {
      if (playbackMode === 'preview') {
        setIsPlaying(false);
      }
    };

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
  }, [playbackMode]);

  const loadTrack = useCallback(async (artist: string, title: string) => {
    const key = `${artist}::${title}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    intentionalPlayRef.current = false;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = '';
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);

    try {
      const track = await spotifyService.searchBestTrackSummary(artist, title, {
        requirePreview: !isSpotifyPremium,
      });

      setCurrentTrack(track);

      // Re-evaluate SDK readiness after the async fetch — it may have changed
      const canUseSdk = isSpotifyPremium && webPlayback.isReady;

      // Guarantee a canonical URI for the SDK path. If the track has an ID
      // but spotifyUri is somehow missing, construct it.
      const sdkUri = track?.spotifyUri ?? (track?.id ? `spotify:track:${track.id}` : null);

      if (canUseSdk && sdkUri) {
        setPlaybackMode('sdk');
        setSdkPending(false);
        setSdkPlaybackFailed(false);
        setSdkPlaybackError(null);
        intentionalPlayRef.current = true;
        const sdkOk = await webPlayback.playTrack(sdkUri);
        if (!sdkOk) {
          // SDK playback request failed — try fallback to preview
          if (track?.previewUrl) {
            setPlaybackMode('preview');
            audio.src = track.previewUrl;
            audio.load();
          } else {
            setPlaybackMode('none');
            setSdkPlaybackFailed(true);
          }
        }
      } else if (isSpotifyPremium && !webPlayback.isReady) {
        // Premium user but SDK not ready yet — mark as pending so the UI
        // shows a "connecting" state and the auto-retry effect takes over.
        setPlaybackMode('none');
        setSdkPending(true);
      } else if (track?.previewUrl) {
        setPlaybackMode('preview');
        setSdkPending(false);
        audio.src = track.previewUrl;
        audio.load();
      } else {
        setPlaybackMode('none');
        setSdkPending(false);
      }
    } catch {
      setCurrentTrack(null);
      setPlaybackMode('none');
    } finally {
      setLoading(false);
    }
  }, [isSpotifyPremium, webPlayback.isReady, webPlayback.playTrack]);

  const loadTrackById = useCallback(async (spotifyId: string, title?: string, artist?: string) => {
    const key = `id::${spotifyId}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    lastAttemptedTrackRef.current = { id: spotifyId, title, artist };
    intentionalPlayRef.current = false;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = '';
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);

    const uri = `spotify:track:${spotifyId}`;

    try {
      // Re-evaluate SDK readiness — may have changed since last render
      const canUseSdk = isSpotifyPremium && webPlayback.isReady;

      if (canUseSdk) {
        // Fetch full track metadata even in SDK mode so the UI has complete info
        let enrichedTrack: SpotifyTrackSummary | null = null;
        try {
          enrichedTrack = await spotifyService.getTrack(spotifyId);
        } catch {
          // Non-fatal: we can still play via SDK with minimal metadata
        }

        const trackData: SpotifyTrackSummary = enrichedTrack ?? {
          id: spotifyId,
          name: title || 'Unknown Track',
          artistName: artist || 'Unknown Artist',
          albumName: null,
          imageUrl: null,
          previewUrl: null,
          spotifyUri: uri,
          durationMs: 0,
          externalUrl: null,
        };
        // Ensure URI is always canonical
        trackData.spotifyUri = uri;

        setPlaybackMode('sdk');
        setSdkPending(false);
        setSdkPlaybackFailed(false);
        setSdkPlaybackError(null);
        setCurrentTrack(trackData);
        intentionalPlayRef.current = true;
        const sdkOk = await webPlayback.playTrack(uri);
        if (!sdkOk) {
          // SDK playback request failed — try fallback to preview
          if (trackData.previewUrl) {
            setPlaybackMode('preview');
            audio.src = trackData.previewUrl;
            audio.load();
          } else {
            setPlaybackMode('none');
            setSdkPlaybackFailed(true);
          }
        }
        setLoading(false);
        return;
      }

      // Premium user but SDK not ready yet
      if (isSpotifyPremium && !webPlayback.isReady) {
        setPlaybackMode('none');
        setSdkPending(true);
        // Still fetch metadata so the UI can display track info while waiting
        try {
          const track = await spotifyService.getTrack(spotifyId);
          setCurrentTrack(track);
        } catch {
          setCurrentTrack({
            id: spotifyId,
            name: title || 'Unknown Track',
            artistName: artist || 'Unknown Artist',
            albumName: null,
            imageUrl: null,
            previewUrl: null,
            spotifyUri: uri,
            durationMs: 0,
            externalUrl: null,
          });
        }
        setLoading(false);
        return;
      }

      const track = await spotifyService.getTrack(spotifyId);
      setCurrentTrack(track);

      if (track?.previewUrl) {
        setPlaybackMode('preview');
        setSdkPending(false);
        audio.src = track.previewUrl;
        audio.load();
      } else {
        setPlaybackMode('none');
        setSdkPending(false);
      }
    } catch {
      setCurrentTrack(null);
      setPlaybackMode('none');
    } finally {
      setLoading(false);
    }
  }, [isSpotifyPremium, webPlayback.isReady, webPlayback.playTrack]);

  const togglePlayPause = useCallback(async () => {
    if (playbackMode === 'none') return;

    if (playbackMode === 'sdk') {
      await webPlayback.togglePlay();
      return;
    }

    const audio = audioRef.current;
    if (!audio || !currentTrack?.previewUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [playbackMode, isPlaying, currentTrack?.previewUrl, webPlayback.togglePlay]);

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

    if (playbackMode === 'sdk') {
      setCurrentTime(time);
      webPlayback.seek(time * 1000);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, [playbackMode, webPlayback.seek]);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const retryPlayback = useCallback(() => {
    if (playbackMode !== 'none') return;
    const last = lastAttemptedTrackRef.current;
    if (!last?.id) return;

    // Force re-trigger by clearing the dedup key and calling loadTrackById
    lastKeyRef.current = '';
    setSdkPending(false);
    void loadTrackById(last.id, last.title, last.artist);
  }, [playbackMode, loadTrackById]);

  const retrySdkPlayback = useCallback(() => {
    const last = lastAttemptedTrackRef.current;
    if (!last?.id) return;
    if (!isSpotifyPremium) return;

    setSdkPlaybackFailed(false);
    setSdkPlaybackError(null);
    lastKeyRef.current = '';
    setSdkPending(false);
    void loadTrackById(last.id, last.title, last.artist);
  }, [isSpotifyPremium, loadTrackById]);

  const value = useMemo<AudioContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      loading,
      playbackMode,
      sdkPending,
      sdkPlaybackFailed,
      sdkPlaybackError,
      loadTrack,
      loadTrackById,
      togglePlayPause,
      play,
      pause,
      seek,
      retryPlayback,
      retrySdkPlayback,
      getAudioElement,
    }),
    [currentTrack, isPlaying, currentTime, duration, loading, playbackMode, sdkPending, sdkPlaybackFailed, sdkPlaybackError, loadTrack, loadTrackById, togglePlayPause, play, pause, seek, retryPlayback, retrySdkPlayback, getAudioElement],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
