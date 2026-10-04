import { apiRequest } from './api';

export type PlaybackSourceKind = 'AUDIO_URL' | 'YOUTUBE' | 'SPOTIFY_PREVIEW' | 'NONE';

export type PlaybackEventType = 'play' | 'pause' | 'complete' | 'skip';

export interface PlaybackSourceSong {
  id: string;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  durationMs: number | null;
}

export interface PlaybackSource {
  source: PlaybackSourceKind;
  audioUrl?: string;
  youtubeVideoId?: string;
  previewUrl?: string;
  song?: PlaybackSourceSong;
}

export interface PlaybackReportPayload {
  songId: string;
  source: PlaybackSourceKind;
  eventType: PlaybackEventType;
  positionMs?: number;
}

export const playbackApi = {
  /** Resolve the best available playback source for a catalog song. */
  getPlaybackSource: (songId: string) =>
    apiRequest<PlaybackSource>(`/playback/${encodeURIComponent(songId)}/source`),

  /** Report a playback event (view count, daily-listen reward). Never throws. */
  reportPlaybackEvent: async (payload: PlaybackReportPayload): Promise<void> => {
    try {
      await apiRequest<{ success: boolean }>('/playback/report', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Telemetry/reward reporting must never break playback.
    }
  },
};
