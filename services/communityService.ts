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

export interface TopicItem {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: { id: string; displayName: string; photoUrl: string | null; role: string };
  category: { id: string; name: string };
  likes: number;
  shares: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  hotScore: number;
  userVote: string | null;
}

export interface TopicListResponse {
  topics: TopicItem[];
  total: number;
  page: number;
  limit: number;
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

  listTopics: (params?: { page?: number; limit?: number; search?: string; sort?: string; categoryId?: string }) =>
    apiRequest<TopicListResponse>(`/community/topics?${toParams(params || {})}`),

  pinTopic: (id: string) =>
    apiRequest<{ isPinned: boolean }>(`/community/topics/${id}/pin`, { method: 'PATCH' }),

  lockTopic: (id: string) =>
    apiRequest<{ isLocked: boolean }>(`/community/topics/${id}/lock`, { method: 'PATCH' }),

  deleteTopic: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/community/topics/${id}`, { method: 'DELETE' }),
};
