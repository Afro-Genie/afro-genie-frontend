import { apiRequest } from './api';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContentReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; displayName: string; email: string } | null;
  moderator: { id: string; displayName: string } | null;
}

export interface TranslationItem {
  id: string;
  originalLyrics: string;
  translatedLyrics: string;
  culturalContext: string | null;
  sourceLang: string;
  targetLang: string;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
  song: { id: string; title: string; artist: { name: string } };
}

export interface CorrectionItem {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string | null;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
  translation: {
    id: string;
    originalLyrics: string;
    translatedLyrics: string;
    sourceLang: string;
    targetLang: string;
    song: { id: string; title: string };
  };
}

export interface ModStats {
  reportsResolved: number;
  correctionsApproved: number;
  translationsApproved: number;
  translationsRejected: number;
  topicsPinned: number;
  topicsLocked: number;
  topicsDeleted: number;
  totalTokensEarned: number;
  currentTokenBalance: number;
  badges: { badgeType: string; earnedAt: string }[];
}

export interface ArtistApplicationItem {
  id: string;
  stageName: string;
  genre: string;
  bio: string;
  status: string;
  createdAt: string;
  user: { id: string; displayName: string; email: string };
  recommendations: { id: string; moderatorId: string; notes: string; createdAt: string }[];
}

export interface NewUserItem {
  id: string;
  displayName: string | null;
  email: string;
  photoUrl: string | null;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { translations: number; topics: number; topicComments: number };
}

export interface ReportStats {
  pending: number;
  resolved: number;
  dismissed: number;
  total: number;
  topModerators: { moderatorId: string; displayName: string; resolvedCount: number }[];
}

export interface Guideline {
  id?: string;
  content: string;
  version: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface CorrectionRequestItem {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  moderatorNote: string | null;
  user: { id: string; displayName: string; email: string };
  resolvedBy: { id: string; displayName: string } | null;
  song: { id: string; title: string };
  translation: { id: string; sourceLang: string; targetLang: string } | null;
}

export interface CorrectionHistory {
  correctedBy: { id: string; displayName: string };
  correctedAt: string;
  requestedBy: { id: string; displayName: string } | null;
  title: string | null;
}

export const moderationApi = {
  reportContent: (targetType: string, targetId: string, reason: string, description?: string) =>
    apiRequest<{ id: string; status: string; createdAt: string }>('/moderation/report', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, reason, description }),
    }),

  getReports: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<ContentReport>>(`/admin/moderation/reports?${new URLSearchParams(params as Record<string, string>).toString()}`),

  resolveReport: (id: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/moderation/reports/${id}/resolve`, { method: 'PATCH' }),

  dismissReport: (id: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/moderation/reports/${id}/dismiss`, { method: 'PATCH' }),

  getReportStats: () =>
    apiRequest<ReportStats>('/admin/moderation/reports/stats'),

  getTranslations: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<TranslationItem>>(`/admin/moderation/translations?${new URLSearchParams(params as Record<string, string>).toString()}`),

  approveTranslation: (id: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/moderation/translations/${id}/approve`, { method: 'PATCH' }),

  rejectTranslation: (id: string, reason?: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/translations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  getCorrections: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<CorrectionItem>>(`/admin/moderation/corrections?${new URLSearchParams(params as Record<string, string>).toString()}`),

  approveCorrection: (id: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/translations/corrections/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) }),

  rejectCorrection: (id: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/translations/corrections/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }),

  updateLyrics: (songId: string, content: string) =>
    apiRequest<{ id: string; content: string }>(`/admin/lyrics/${songId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),

  getArtistApplications: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<ArtistApplicationItem>>(`/admin/moderation/artist-applications?${new URLSearchParams(params as Record<string, string>).toString()}`),

  recommendApplication: (id: string, notes: string) =>
    apiRequest<{ id: string; notes: string }>(`/admin/moderation/artist-applications/${id}/recommend`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

  getNewUsers: (params?: { days?: number; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<NewUserItem>>(`/admin/moderation/new-users?${new URLSearchParams(params as Record<string, string>).toString()}`),

  getModStats: (id: string) =>
    apiRequest<ModStats>(`/admin/moderation/moderator/${id}/stats`),

  getGuidelines: () =>
    apiRequest<Guideline>('/admin/moderation/guidelines'),

  updateGuidelines: (content: string) =>
    apiRequest<Guideline>('/admin/moderation/guidelines', { method: 'PUT', body: JSON.stringify({ content }) }),

  sendWelcomeMessage: (userId: string, message: string) =>
    apiRequest<{ ok: boolean }>(`/admin/moderation/users/${userId}/welcome`, { method: 'POST', body: JSON.stringify({ message }) }),

  submitCorrectionRequest: (translationId: string, title: string, description: string) =>
    apiRequest<CorrectionRequestItem>(`/translations/${translationId}/correction-request`, { method: 'POST', body: JSON.stringify({ title, description }) }),

  getCorrectionHistory: (translationId: string) =>
    apiRequest<CorrectionHistory | null>(`/translations/${translationId}/correction-history`),

  getCorrectionRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    apiRequest<PaginatedResponse<CorrectionRequestItem>>(`/admin/moderation/correction-requests?${new URLSearchParams(params as Record<string, string>).toString()}`),

  resolveCorrectionRequest: (id: string, correctedLyrics: string, moderatorNote?: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/moderation/correction-requests/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ correctedLyrics, moderatorNote }) }),

  rejectCorrectionRequest: (id: string, moderatorNote?: string) =>
    apiRequest<{ id: string; status: string }>(`/admin/moderation/correction-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ moderatorNote }) }),
};
