import { apiRequest } from './api';
import type { Playlist } from '../types';

interface CreatePlaylistData {
  name: string;
  description?: string;
  imageUrl?: string;
  songIds?: string[];
  isPublic?: boolean;
}

function toParams(obj: Record<string, string | number | undefined>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== ''),
    ) as Record<string, string>,
  ).toString();
}

export const playlistApi = {
  listPlaylists: (params?: { page?: number; limit?: number }) =>
    apiRequest<{ playlists: Playlist[]; total: number; page: number; limit: number }>(
      `/playlists?${toParams(params || {})}`,
    ),

  createPlaylist: (data: CreatePlaylistData) =>
    apiRequest<Playlist>('/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  likePlaylist: (playlistId: string) =>
    apiRequest<{ liked: boolean; likeCount: number }>(`/playlists/${playlistId}/like`, {
      method: 'POST',
    }),
};
