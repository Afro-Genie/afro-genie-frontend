interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayer {
  addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'player_state_changed', callback: (state: SpotifyPlayerState | null) => void): void;
  addListener(event: 'authentication_error', callback: (data: { message: string }) => void): void;
  addListener(event: 'account_error', callback: (data: { message: string }) => void): void;
  addListener(event: 'playback_error', callback: (data: { message: string }) => void): void;
  addListener(event: string, callback: (...args: unknown[]) => void): void;
  removeListener(event: string, callback?: (...args: unknown[]) => void): void;
  connect(): boolean;
  disconnect(): void;
  activateElement(): Promise<boolean>;
  getCurrentState(): Promise<SpotifyPlayerState | null>;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

interface SpotifyPlayerState {
  context: { uri: string; metadata: Record<string, unknown> };
  disallows: { resuming: boolean; skipping_prev: boolean; skipping_next: boolean };
  duration: number;
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string; height: number | null; width: number | null }>;
  };
  artists: Array<{ uri: string; name: string }>;
}

interface Window {
  Spotify: {
    Player: {
      new (options: SpotifyPlayerOptions): SpotifyPlayer;
    };
  };
  onSpotifyWebPlaybackSDKReady?: () => void;
}
