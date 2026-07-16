import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { spotifyAuthService } from '../services/spotifyAuthService';
import { useAuth } from './AuthContext';

interface PlaybackDiagnostics {
  sdkScriptPresent: boolean;
  sdkGlobalAvailable: boolean;
  sdkGlobalType: string;
  spotifyKeys: string[];
  playerType: string;
  readyEventFired: boolean;
  deviceIdAttached: boolean;
  sdkError: string | null;
  playerCreated: boolean;
  playerConnected: boolean;
  tokenAvailable: boolean;
  premiumDetected: boolean;
  eventLog: DiagnosticEvent[];
}

interface DiagnosticEvent {
  timestamp: number;
  phase: string;
  message: string;
  data?: Record<string, unknown>;
}

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
  /** True when the last playTrack/playUris API call failed (device offline, 403, etc.). */
  sdkPlaybackFailed: boolean;
  /** Error message from the last failed SDK playback attempt. */
  sdkPlaybackError: string | null;
  diagnostics: PlaybackDiagnostics;
}

interface WebPlaybackContextValue extends WebPlaybackState {
  playTrack: (uri: string) => Promise<boolean>;
  playUris: (uris: string[], index?: number) => Promise<boolean>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setShuffle: (shuffle: boolean) => Promise<void>;
  /** Clear the sdkPlaybackFailed/sdkPlaybackError state after consumer has handled it. */
  clearSdkPlaybackFailed: () => void;
}

const MAX_EVENT_LOG = 100;

const logDiagnostic = (event: DiagnosticEvent) => {
  const ts = new Date(event.timestamp).toISOString().slice(11, 23);
  console.log(`[PlaybackDiagnostic] ${ts} [${event.phase}] ${event.message}`, event.data ?? '');
};

const WebPlaybackContext = createContext<WebPlaybackContextValue | null>(null);

export function useWebPlayback(): WebPlaybackContextValue {
  const ctx = useContext(WebPlaybackContext);
  if (!ctx) {
    throw new Error('useWebPlayback must be used within a WebPlaybackProvider');
  }
  return ctx;
}

export function WebPlaybackProvider({ children }: { children: ReactNode }) {
  const { isSpotifyPremium } = useAuth();
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventLogRef = useRef<DiagnosticEvent[]>([]);
  const initStartTimeRef = useRef<number>(Date.now());
  const timelineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const [sdkPlaybackFailed, setSdkPlaybackFailed] = useState(false);
  const [sdkPlaybackError, setSdkPlaybackError] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<PlaybackDiagnostics>({
    sdkScriptPresent: false,
    sdkGlobalAvailable: false,
    sdkGlobalType: 'undefined',
    spotifyKeys: [],
    playerType: 'undefined',
    readyEventFired: false,
    deviceIdAttached: false,
    sdkError: null,
    playerCreated: false,
    playerConnected: false,
    tokenAvailable: false,
    premiumDetected: false,
    eventLog: [],
  });

  const pushEvent = useCallback((phase: string, message: string, data?: Record<string, unknown>) => {
    const event: DiagnosticEvent = { timestamp: Date.now(), phase, message, data };
    eventLogRef.current = [...eventLogRef.current.slice(-MAX_EVENT_LOG + 1), event];
    logDiagnostic(event);
    setDiagnostics((prev) => ({ ...prev, eventLog: eventLogRef.current }));
  }, []);

  const snapshotDiagnostics = useCallback((overrides: Partial<PlaybackDiagnostics> = {}): PlaybackDiagnostics => {
    const sdkScriptPresent = overrides.sdkScriptPresent ?? Boolean(document.querySelector('script[src*="spotify-player.js"]'));
    const sdkGlobalAvailable = overrides.sdkGlobalAvailable ?? (typeof window.Spotify === 'function');
    const sdkGlobalType = overrides.sdkGlobalType ?? typeof window.Spotify;
    const spotifyRaw = window.Spotify as unknown as Record<string, unknown> | null;
    const spotifyKeys = overrides.spotifyKeys ?? (typeof spotifyRaw === 'object' && spotifyRaw !== null
      ? Object.keys(spotifyRaw)
      : []);
    const playerType = overrides.playerType ?? typeof spotifyRaw?.Player;
    const snap: PlaybackDiagnostics = {
      sdkScriptPresent,
      sdkGlobalAvailable,
      sdkGlobalType,
      spotifyKeys,
      playerType,
      readyEventFired: overrides.readyEventFired ?? false,
      deviceIdAttached: overrides.deviceIdAttached ?? Boolean(deviceIdRef.current),
      sdkError: overrides.sdkError ?? null,
      playerCreated: overrides.playerCreated ?? Boolean(playerRef.current),
      playerConnected: overrides.playerConnected ?? false,
      tokenAvailable: overrides.tokenAvailable ?? Boolean(spotifyAuthService.getStoredAccessToken()),
      premiumDetected: overrides.premiumDetected ?? false,
      eventLog: eventLogRef.current,
    };
    setDiagnostics(snap);
    return snap;
  }, []);

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
          window.dispatchEvent(new Event('spotify:token-refreshed'));
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
          // Signal AuthContext to re-check Spotify product status
          window.dispatchEvent(new Event('spotify:token-refreshed'));
        }).catch(() => {});
      }
    }, 30 * 60 * 1000);
  }, []);

  useEffect(() => {
    if (!isSpotifyPremium) {
      pushEvent('init', 'Non-premium user — skipping SDK init', { isSpotifyPremium });
      snapshotDiagnostics({ premiumDetected: false });
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

    pushEvent('init', 'Premium user detected — beginning SDK bootstrap', { isSpotifyPremium });
    initStartTimeRef.current = Date.now();

    const sdkScriptPresent = Boolean(document.querySelector('script[src*="spotify-player.js"]'));
    const sdkGlobalAvailable = typeof window.Spotify === 'function';
    const spotifyRaw = window.Spotify as unknown as Record<string, unknown> | null;
    const spotifyKeys = typeof spotifyRaw === 'object' && spotifyRaw !== null
      ? Object.keys(spotifyRaw)
      : [];
    const playerType = typeof spotifyRaw?.Player;
    pushEvent('init', 'SDK script tag check', {
      sdkScriptPresent,
      sdkGlobalAvailable,
      sdkGlobalType: typeof window.Spotify,
      spotifyKeys,
      playerType,
    });

    snapshotDiagnostics({ premiumDetected: true, sdkScriptPresent, sdkGlobalAvailable });

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;

    const createPlayer = async () => {
      if (cancelled || playerRef.current) return;

      pushEvent('createPlayer', 'Attempting player creation');

      const hasToken = await ensureFreshToken();
      if (cancelled) return;
      if (!hasToken) {
        pushEvent('createPlayer', 'No valid token available — cannot create player', { hasToken });
        setSdkError('Spotify authentication required. Please reconnect your Spotify account.');
        snapshotDiagnostics({ tokenAvailable: false, sdkError: 'No valid token' });
        return;
      }

      pushEvent('createPlayer', 'Token validated successfully');

      const PlayerConstructor = typeof window.Spotify === 'function'
        ? window.Spotify
        : typeof (window.Spotify as unknown as Record<string, unknown>)?.Player === 'function'
          ? (window.Spotify as unknown as { Player: new (opts: SpotifyPlayerOptions) => SpotifyPlayer }).Player
          : null;

      if (!PlayerConstructor) {
        const spotifyRaw = window.Spotify as unknown as Record<string, unknown> | null;
        const spotifyKeys = typeof spotifyRaw === 'object' && spotifyRaw !== null
          ? Object.keys(spotifyRaw)
          : [];
        const playerType = typeof spotifyRaw?.Player;
        pushEvent('createPlayer', 'No usable Spotify constructor found', {
          sdkGlobalType: typeof window.Spotify,
          spotifyKeys,
          playerType,
        });
        snapshotDiagnostics({ sdkGlobalAvailable: false, tokenAvailable: true });
        return;
      }

      pushEvent('createPlayer', 'Spotify constructor found — constructing player instance', {
        constructorPath: typeof window.Spotify === 'function' ? 'Spotify' : 'Spotify.Player',
      });

      try {
        const player = new PlayerConstructor({
          name: 'Afro Genie Web Player',
          getOAuthToken: getOAuthTokenForSdk,
          volume: 0.8,
        });

        playerRef.current = player;
        pushEvent('createPlayer', 'Player instance created successfully');
        snapshotDiagnostics({ playerCreated: true, tokenAvailable: true });

        player.addListener('ready', ({ device_id }) => {
          if (cancelled) return;
          pushEvent('ready', 'SDK ready event fired', { device_id, elapsedMs: Date.now() - initStartTimeRef.current });
          deviceIdRef.current = device_id;
          setDeviceId(device_id);
          setIsReady(true);
          setSdkError(null);
          setSdkPlaybackFailed(false);
          setSdkPlaybackError(null);
          refreshTokenPeriodically();
          snapshotDiagnostics({ readyEventFired: true, deviceIdAttached: true, playerCreated: true });

          if (timelineTimerRef.current) clearInterval(timelineTimerRef.current);
          timelineTimerRef.current = setInterval(async () => {
            if (cancelled || !playerRef.current) {
              if (timelineTimerRef.current) clearInterval(timelineTimerRef.current);
              return;
            }
            try {
              const state = await playerRef.current.getCurrentState();
              if (state) {
                setIsPlaying(!state.paused);
                setCurrentTime(state.position);
                setDuration(state.duration);
              }
            } catch {
              // getCurrentState can throw if player is not connected
            }
          }, 1000);
        });

        player.addListener('not_ready', ({ device_id }) => {
          if (cancelled) return;
          pushEvent('not_ready', 'SDK not_ready event fired', { device_id });
          if (timelineTimerRef.current) {
            clearInterval(timelineTimerRef.current);
            timelineTimerRef.current = null;
          }
          setIsReady(false);
          setDeviceId(null);
          deviceIdRef.current = null;
          snapshotDiagnostics({ readyEventFired: false, deviceIdAttached: false });
        });

        player.addListener('player_state_changed', (state) => {
          if (!state) {
            pushEvent('player_state_changed', 'State changed to null (empty state)');
            return;
          }

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

        const sanitizeLog = (msg: string) => String(msg).replace(/\r|\n/g, ' ');

        player.addListener('authentication_error', (data) => {
          const msg = sanitizeLog(data.message);
          console.error('[WebPlayback] Authentication error:', msg);
          pushEvent('authentication_error', msg);
          if (!cancelled) {
            setIsReady(false);
            setSdkError('Spotify player authentication failed. Please reconnect your Spotify account.');
            snapshotDiagnostics({ sdkError: msg });
          }
        });

        player.addListener('account_error', (data) => {
          const msg = sanitizeLog(data.message);
          console.error('[WebPlayback] Account error:', msg);
          pushEvent('account_error', msg);
          if (!cancelled) {
            setIsReady(false);
            setSdkError('Spotify Premium is required for full playback. Upgrade to Premium to use this feature.');
            snapshotDiagnostics({ sdkError: msg });
          }
        });

        player.addListener('playback_error', (data) => {
          const msg = sanitizeLog(data.message);
          console.error('[WebPlayback] Playback error:', msg);
          pushEvent('playback_error', msg);
        });

        pushEvent('createPlayer', 'Calling player.connect()');
        snapshotDiagnostics({ playerConnected: true });
        player.connect();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[WebPlayback] Failed to create Spotify player:', err);
        pushEvent('createPlayer', `Player creation failed: ${errMsg}`);
        if (!cancelled) {
          setSdkError('Spotify player is unavailable. Please refresh the page or try again later.');
          snapshotDiagnostics({ sdkError: errMsg });
        }
      }
    };

    const sdkReady = typeof window.Spotify === 'function'
      || typeof (window.Spotify as unknown as Record<string, unknown>)?.Player === 'function';

    if (sdkReady) {
      pushEvent('init', 'SDK already loaded — creating player immediately');
      createPlayer();
    } else {
      pushEvent('init', 'SDK not yet loaded — setting callback and starting poll', {
        callbackSet: true,
      });
      window.onSpotifyWebPlaybackSDKReady = () => {
        pushEvent('init', 'onSpotifyWebPlaybackSDKReady callback fired');
        createPlayer();
      };

      const pollForSdk = () => {
        if (cancelled) return;
        pollCount++;
        const pollSpotifyRaw = window.Spotify as unknown as Record<string, unknown> | null;
        const pollPlayerReady = typeof window.Spotify === 'function'
          || typeof pollSpotifyRaw?.Player === 'function';
        if (pollPlayerReady) {
          pushEvent('poll', `SDK ready detected after ${pollCount} polls`, {
            constructorPath: typeof window.Spotify === 'function' ? 'Spotify' : 'Spotify.Player',
          });
          createPlayer();
          return;
        }
        if (typeof window.Spotify === 'object' && window.Spotify !== null) {
          const spotifyKeys = Object.keys(pollSpotifyRaw!);
          const playerType = typeof pollSpotifyRaw?.Player;
          pushEvent('poll', `SDK present but no constructor yet (${pollCount} polls)`, {
            spotifyKeys,
            playerType,
          });
          snapshotDiagnostics({ sdkGlobalAvailable: false });
        }
        if (pollCount % 10 === 0) {
          pushEvent('poll', `SDK still not ready after ${pollCount} polls (${pollCount * 200}ms)`);
          snapshotDiagnostics({ sdkGlobalAvailable: false });
        }
        pollTimer = setTimeout(pollForSdk, 200);
      };
      pollTimer = setTimeout(pollForSdk, 500);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (timelineTimerRef.current) {
        clearInterval(timelineTimerRef.current);
        timelineTimerRef.current = null;
      }
      if (tokenRefreshTimerRef.current) {
        clearInterval(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      delete window.onSpotifyWebPlaybackSDKReady;
      pushEvent('cleanup', 'Provider effect cleaned up');
      setIsReady(false);
      setDeviceId(null);
      setSdkError(null);
      setSdkPlaybackFailed(false);
      setSdkPlaybackError(null);
      deviceIdRef.current = null;
    };
  }, [isSpotifyPremium, getFreshToken, getOAuthTokenForSdk, ensureFreshToken, refreshTokenPeriodically, pushEvent, snapshotDiagnostics]);

  const playTrack = useCallback(async (uri: string): Promise<boolean> => {
    const player = playerRef.current;
    const id = deviceIdRef.current;
    if (!player || !id) {
      setSdkPlaybackFailed(true);
      setSdkPlaybackError('Spotify player is not connected. Please try again.');
      return false;
    }

    const token = await getFreshTokenAsync();
    if (!token) {
      setSdkPlaybackFailed(true);
      setSdkPlaybackError('Spotify authentication expired. Please reconnect your account.');
      return false;
    }

    setSdkPlaybackFailed(false);
    setSdkPlaybackError(null);

    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let errorMsg = 'Failed to start playback on Spotify.';
      if (res.status === 403) {
        errorMsg = 'Spotify Premium is required for full track playback.';
      } else if (res.status === 404) {
        errorMsg = 'No active Spotify device found. Open Spotify and try again.';
      } else if (res.status === 429) {
        errorMsg = 'Too many requests to Spotify. Please wait a moment and try again.';
      }
      console.error(`[WebPlayback] playTrack failed (${res.status}):`, errorBody);
      setSdkPlaybackFailed(true);
      setSdkPlaybackError(errorMsg);
      return false;
    }
    return true;
  }, [getFreshTokenAsync]);

  const playUris = useCallback(async (uris: string[], index: number = 0): Promise<boolean> => {
    const player = playerRef.current;
    const id = deviceIdRef.current;
    if (!player || !id || uris.length === 0) {
      setSdkPlaybackFailed(true);
      setSdkPlaybackError('Spotify player is not connected. Please try again.');
      return false;
    }

    const token = await getFreshTokenAsync();
    if (!token) {
      setSdkPlaybackFailed(true);
      setSdkPlaybackError('Spotify authentication expired. Please reconnect your account.');
      return false;
    }

    setSdkPlaybackFailed(false);
    setSdkPlaybackError(null);

    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris, offset: { position: index } }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let errorMsg = 'Failed to start playback on Spotify.';
      if (res.status === 403) {
        errorMsg = 'Spotify Premium is required for full track playback.';
      } else if (res.status === 404) {
        errorMsg = 'No active Spotify device found. Open Spotify and try again.';
      } else if (res.status === 429) {
        errorMsg = 'Too many requests to Spotify. Please wait a moment and try again.';
      }
      console.error(`[WebPlayback] playUris failed (${res.status}):`, errorBody);
      setSdkPlaybackFailed(true);
      setSdkPlaybackError(errorMsg);
      return false;
    }
    return true;
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
    setCurrentTime(positionMs);
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

  const clearSdkPlaybackFailed = useCallback(() => {
    setSdkPlaybackFailed(false);
    setSdkPlaybackError(null);
  }, []);

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
      sdkPlaybackFailed,
      sdkPlaybackError,
      diagnostics,
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
      clearSdkPlaybackFailed,
    }),
    [
      isReady, deviceId, isPlaying, currentTime, duration,
      currentTrackUri, currentTrackName, currentTrackArtist,
      shuffle, volume, sdkError, sdkPlaybackFailed, sdkPlaybackError,
      diagnostics, playTrack, playUris, pause, resume, togglePlay, seek,
      nextTrack, previousTrack, setVolume, setShuffle, clearSdkPlaybackFailed,
    ],
  );

  return <WebPlaybackContext.Provider value={value}>{children}</WebPlaybackContext.Provider>;
}
