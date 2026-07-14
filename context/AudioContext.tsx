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
  externalUrl: string | null;
}

interface AudioContextValue extends AudioState {
  loadTrack: (artist: string, title: string) => Promise<void>;
  loadTrackById: (spotifyId: string, title?: string, artist?: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
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
  const [externalUrl, setExternalUrl] = useState<string | null>(null);
  const lastKeyRef = useRef<string>('');

  const { isSpotifyPremium } = useAuth();
  const webPlayback = useWebPlayback();

  // Sync state from WebPlayback when in SDK mode
  useEffect(() => {
    if (playbackMode !== 'sdk') return;
    setIsPlaying(webPlayback.isPlaying);
    setCurrentTime(webPlayback.currentTime / 1000);
    setDuration(webPlayback.duration / 1000);
  }, [playbackMode, webPlayback.isPlaying, webPlayback.currentTime, webPlayback.duration]);

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

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = '';
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);

    try {
      const canUseSdk = isSpotifyPremium && webPlayback.isReady;
      const track = await spotifyService.searchBestTrackSummary(artist, title, {
        requirePreview: !canUseSdk,
      });

      setCurrentTrack(track);

      if (canUseSdk && track?.spotifyUri) {
        setPlaybackMode('sdk');
        setExternalUrl(null);
        await webPlayback.playTrack(track.spotifyUri);
      } else if (track?.previewUrl) {
        setPlaybackMode('preview');
        setExternalUrl(null);
        audio.src = track.previewUrl;
        audio.load();
      } else {
        setPlaybackMode('none');
        setExternalUrl(null);
      }
    } catch {
      setCurrentTrack(null);
      setPlaybackMode('none');
      setExternalUrl(null);
    } finally {
      setLoading(false);
    }
  }, [isSpotifyPremium, webPlayback.isReady, webPlayback.playTrack]);

  const loadTrackById = useCallback(async (spotifyId: string, title?: string, artist?: string) => {
    const key = `id::${spotifyId}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

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
      const canUseSdk = isSpotifyPremium && webPlayback.isReady;

      if (canUseSdk) {
        setPlaybackMode('sdk');
        setExternalUrl(null);
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
        await webPlayback.playTrack(uri);
        setLoading(false);
        return;
      }

      const track = await spotifyService.getTrack(spotifyId);
      setCurrentTrack(track);

      if (track?.previewUrl) {
        setPlaybackMode('preview');
        setExternalUrl(null);
        audio.src = track.previewUrl;
        audio.load();
      } else {
        setPlaybackMode('none');
        setExternalUrl(null);
      }
    } catch {
      setCurrentTrack(null);
      setPlaybackMode('none');
      setExternalUrl(null);
    } finally {
      setLoading(false);
    }
  }, [isSpotifyPremium, webPlayback.isReady, webPlayback.playTrack]);

  const togglePlayPause = useCallback(async () => {
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
    if (playbackMode === 'sdk') {
      webPlayback.seek(time * 1000);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, [playbackMode, webPlayback.seek]);

  const getAudioElement = useCallback(() => audioRef.current, []);

  const value = useMemo<AudioContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      loading,
      playbackMode,
      externalUrl,
      loadTrack,
      loadTrackById,
      togglePlayPause,
      play,
      pause,
      seek,
      getAudioElement,
    }),
    [currentTrack, isPlaying, currentTime, duration, loading, playbackMode, externalUrl, loadTrack, loadTrackById, togglePlayPause, play, pause, seek, getAudioElement],
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}
