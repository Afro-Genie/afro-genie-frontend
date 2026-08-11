import { apiRequest } from './api';
import type { AppNotification } from '../types';

export interface BackendNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeedResponse {
  data: BackendNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const toAppNotification = (n: BackendNotification): AppNotification => ({
  id: n.id,
  userId: n.userId,
  title: n.title,
  message: n.message,
  read: n.read,
  createdAt: n.createdAt,
  type: 'system',
});

export const notificationApi = {
  getFeed: (page = 1, limit = 20) =>
    apiRequest<NotificationFeedResponse>(`/users/me/notifications?page=${page}&limit=${limit}`),

  getUnreadCount: () =>
    apiRequest<{ count: number }>('/users/me/notifications/unread-count'),

  markRead: (id: string) =>
    apiRequest<{ ok: boolean }>(`/users/me/notifications/${id}/read`, { method: 'PATCH' }),

  mapToApp: (n: BackendNotification): AppNotification => toAppNotification(n),
};
