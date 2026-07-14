import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { spotifyAuthService } from '../services/spotifyAuthService';
import { useAuth } from './AuthContext';

interface WebPlaybackState {
  isReady: boolean;
  deviceId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentTrackUri: string | null;
  currentTrackName: string | null;
  currentTrackArtist: string | null;
  shuffle: boolean;
  volume: number;
  sdkError: string | null;
}

interface WebPlaybackContextValue extends WebPlaybackState {
  playTrack: (uri: string) => Promise<void>;
  playUris: (uris: string[], index?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setShuffle: (shuffle: boolean) => Promise<void>;
}

const WebPlaybackContext = createContext<WebPlaybackContextValue | null>(null);

export function useWebPlayback(): WebPlaybackContextValue {
  const ctx = useContext(WebPlaybackContext);
  if (!ctx) {
    throw new Error('useWebPlayback must be used within a WebPlaybackProvider');
  }
  return ctx;
}

export function WebPlaybackProvider({ children }: { children: ReactNode }) {
  const { isSpotifyPremium, userProfile } = useAuth();
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [currentTrackArtist, setCurrentTrackArtist] = useState<string | null>(null);
  const [shuffle, setShuffleState] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const getFreshToken = useCallback((): string => {
    const token = spotifyAuthService.getStoredAccessToken();
    if (!token) return '';
    if (spotifyAuthService.isTokenExpiringSoon()) {
      const refresh = spotifyAuthService.getStoredRefreshToken();
      if (refresh) {
        spotifyAuthService.refreshAccessToken(refresh).then((tokens) => {
          spotifyAuthService.storeTokens(tokens);
        }).catch(() => {});
      }
    }
    return token;
  }, []);

  const getFreshTokenAsync = useCallback(async (): Promise<string> => {
    const token = spotifyAuthService.getStoredAccessToken();
    if (token && !spotifyAuthService.isTokenExpiringSoon()) return token;
    const refresh = spotifyAuthService.getStoredRefreshToken();
    if (refresh) {
      try {
        const tokens = await spotifyAuthService.refreshAccessToken(refresh);
        spotifyAuthService.storeTokens(tokens);
        return tokens.access_token;
      } catch {
        return spotifyAuthService.getStoredAccessToken() || '';
      }
    }
    return token || '';
  }, []);

  const getOAuthTokenForSdk = useCallback((callback: (token: string) => void) => {
    const token = spotifyAuthService.getStoredAccessToken();
    if (token && !spotifyAuthService.isTokenExpiringSoon()) {
      callback(token);
      return;
    }
    const refresh = spotifyAuthService.getStoredRefreshToken();
    if (refresh) {
      spotifyAuthService.refreshAccessToken(refresh)
        .then((tokens) => {
          spotifyAuthService.storeTokens(tokens);
          callback(tokens.access_token);
        })
        .catch(() => {
          callback(spotifyAuthService.getStoredAccessToken() || '');
        });
    } else {
      callback(token || '');
    }
  }, []);

  const ensureFreshToken = useCallback(async (): Promise<boolean> => {
    const token = spotifyAuthService.getStoredAccessToken();
    if (token && !spotifyAuthService.isTokenExpiringSoon()) return true;
    const refresh = spotifyAuthService.getStoredRefreshToken();
    if (!refresh) return false;
    try {
      const tokens = await spotifyAuthService.refreshAccessToken(refresh);
      spotifyAuthService.storeTokens(tokens);
      return true;
    } catch {
      return Boolean(spotifyAuthService.getStoredAccessToken());
    }
  }, []);

  const refreshTokenPeriodically = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearInterval(tokenRefreshTimerRef.current);
    }
    tokenRefreshTimerRef.current = setInterval(() => {
      const refresh = spotifyAuthService.getStoredRefreshToken();
      if (refresh) {
        spotifyAuthService.refreshAccessToken(refresh).then((tokens) => {
          spotifyAuthService.storeTokens(tokens);
        }).catch(() => {});
      }
    }, 30 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (!isSpotifyPremium) {
      setIsReady(false);
      setDeviceId(null);
      deviceIdRef.current = null;
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const createPlayer = async () => {
      if (cancelled || playerRef.current) return;

      // Ensure we have a valid token before SDK calls getOAuthToken.
      const hasToken = await ensureFreshToken();
      if (cancelled) return;
      if (!hasToken) {
        setSdkError('Spotify authentication required. Please reconnect your Spotify account.');
        return;
      }

      // Guard: ensure the SDK constructor is available
      if (typeof window.Spotify !== 'function') {
        console.warn('[WebPlayback] window.Spotify is not a function, SDK may not have loaded yet');
        return;
      }

      try {
        const player = new window.Spotify({
          name: 'Afro Genie Web Player',
          getOAuthToken: getOAuthTokenForSdk,
          volume: 0.8,
        });

        playerRef.current = player;

        player.addListener('ready', ({ device_id }) => {
          if (cancelled) return;
          deviceIdRef.current = device_id;
          setDeviceId(device_id);
          setIsReady(true);
          setSdkError(null);
          refreshTokenPeriodically();
        });

        player.addListener('not_ready', () => {
          if (cancelled) return;
          setIsReady(false);
          setDeviceId(null);
          deviceIdRef.current = null;
        });

        player.addListener('player_state_changed', (state) => {
          if (!state) return;

          setIsPlaying(!state.paused);
          setCurrentTime(state.position);
          setDuration(state.duration);
          setShuffleState(state.shuffle);

          const currentTrack = state.track_window.current_track;
          if (currentTrack) {
            setCurrentTrackUri(currentTrack.uri);
            setCurrentTrackName(currentTrack.name);
            setCurrentTrackArtist(currentTrack.artists?.[0]?.name ?? null);
          } else {
            setCurrentTrackUri(null);
            setCurrentTrackName(null);
            setCurrentTrackArtist(null);
          }
        });

        player.addListener('authentication_error', (data) => {
          console.error('[WebPlayback] Authentication error:', data.message);
          if (!cancelled) {
            setIsReady(false);
            setSdkError('Spotify player authentication failed. Please reconnect your Spotify account.');
          }
        });

        player.addListener('account_error', (data) => {
          console.error('[WebPlayback] Account error:', data.message);
          if (!cancelled) {
            setIsReady(false);
            setSdkError('Spotify Premium is required for full playback. Upgrade to Premium to use this feature.');
          }
        });

        player.addListener('playback_error', (data) => {
          console.error('[WebPlayback] Playback error:', data.message);
        });

        player.connect();
      } catch (err) {
        console.error('[WebPlayback] Failed to create Spotify player:', err);
        if (!cancelled) {
          setSdkError('Spotify player is unavailable. Please refresh the page or try again later.');
        }
      }
    };

    // If the SDK is already loaded, create immediately
    if (typeof window.Spotify === 'function') {
      createPlayer();
    } else {
      // Set the global callback for when the SDK finishes loading
      window.onSpotifyWebPlaybackSDKReady = createPlayer;

      // Also poll in case the SDK loaded before our callback was set
      // (e.g. script loaded between our check and callback assignment)
      const pollForSdk = () => {
        if (cancelled) return;
        if (typeof window.Spotify === 'function') {
          createPlayer();
          return;
        }
        pollTimer = setTimeout(pollForSdk, 200);
      };
      pollTimer = setTimeout(pollForSdk, 500);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      delete window.onSpotifyWebPlaybackSDKReady;
      setIsReady(false);
      setDeviceId(null);
      setSdkError(null);
      deviceIdRef.current = null;
    };
  }, [isSpotifyPremium, getFreshToken, getOAuthTokenForSdk, ensureFreshToken, refreshTokenPeriodically]);

  const playTrack = useCallback(async (uri: string) => {
    const player = playerRef.current;
    const id = deviceIdRef.current;
    if (!player || !id) return;

    const token = await getFreshTokenAsync();
    if (!token) return;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });
  }, [getFreshTokenAsync]);

  const playUris = useCallback(async (uris: string[], index: number = 0) => {
    const player = playerRef.current;
    const id = deviceIdRef.current;
    if (!player || !id || uris.length === 0) return;

    const token = await getFreshTokenAsync();
    if (!token) return;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris, offset: { position: index } }),
    });
  }, [getFreshTokenAsync]);

  const pause = useCallback(async () => {
    await playerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    await playerRef.current?.seek(positionMs);
  }, []);

  const nextTrack = useCallback(async () => {
    await playerRef.current?.nextTrack();
  }, []);

  const previousTrack = useCallback(async () => {
    await playerRef.current?.previousTrack();
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol));
    setVolumeState(clamped);
    await playerRef.current?.setVolume(clamped);
  }, []);

  const setShuffle = useCallback(async (state: boolean) => {
    const token = await getFreshTokenAsync();
    const id = deviceIdRef.current;
    if (!token || !id) return;

    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}&device_id=${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    setShuffleState(state);
  }, [getFreshTokenAsync]);

  const value = useMemo<WebPlaybackContextValue>(
    () => ({
      isReady,
      deviceId,
      isPlaying,
      currentTime,
      duration,
      currentTrackUri,
      currentTrackName,
      currentTrackArtist,
      shuffle,
      volume,
      sdkError,
      playTrack,
      playUris,
      pause,
      resume,
      togglePlay,
      seek,
      nextTrack,
      previousTrack,
      setVolume,
      setShuffle,
    }),
    [
      isReady, deviceId, isPlaying, currentTime, duration,
      currentTrackUri, currentTrackName, currentTrackArtist,
      shuffle, volume, sdkError,
      playTrack, playUris, pause, resume, togglePlay, seek,
      nextTrack, previousTrack, setVolume, setShuffle,
    ],
  );

  return <WebPlaybackContext.Provider value={value}>{children}</WebPlaybackContext.Provider>;
}
