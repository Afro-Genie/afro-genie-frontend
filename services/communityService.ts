import { apiRequest } from './api';
import type {
  CommunityFeedResponse,
  ExploreData,
  RecommendedModerator,
  UserListeningPreference,
} from '../types';

function toParams(obj: Record<string, string | number | undefined | null>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== ''),
    ) as Record<string, string>,
  ).toString();
}

export const communityApi = {
  getFeed: (params?: { page?: number; limit?: number; categoryId?: string; search?: string }) =>
    apiRequest<CommunityFeedResponse>(`/community/feed?${toParams(params || {})}`),

  getTrending: (params?: { page?: number; limit?: number }) =>
    apiRequest<CommunityFeedResponse>(`/community/trending?${toParams(params || {})}`),

  getModeratorPicks: (params?: { page?: number; limit?: number }) =>
    apiRequest<CommunityFeedResponse>(`/community/moderator-picks?${toParams(params || {})}`),

  getForYou: (params?: { page?: number; limit?: number }) =>
    apiRequest<CommunityFeedResponse>(`/community/for-you?${toParams(params || {})}`),

  getExploreData: () =>
    apiRequest<ExploreData>('/community/explore/what-others-listen'),

  getRecommendedModerators: (limit = 10) =>
    apiRequest<RecommendedModerator[]>(`/community/recommended-moderators?limit=${limit}`),

  recordTopicView: (topicId: string) =>
    apiRequest<{ success: boolean }>(`/community/topics/${topicId}/view`, { method: 'POST' }),

  computeListeningPreferences: () =>
    apiRequest<UserListeningPreference>('/users/listening-preferences/compute', { method: 'POST' }),

  getListeningPreferences: () =>
    apiRequest<UserListeningPreference>('/users/listening-preferences'),
};
