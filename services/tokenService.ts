import { apiRequest } from './api';

export interface TokenReward {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface TokenHistoryResponse {
  rewards: TokenReward[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserProfile {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  role: string;
  tokenBalance: number;
  badges: UserBadge[];
  memberSince: string;
}

export interface UserBadge {
  id: string;
  badgeType: string;
  earnedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoUrl: string | null;
  totalTokens: number;
  rewardCount: number;
}

export interface AdminRewardEntry {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
    photoUrl: string | null;
  };
}

export interface AdminRewardStats {
  totalRewards: number;
  totalTokensDistributed: number;
  totalBadges: number;
  topReasons: Array<{ reason: string; count: number; totalTokens: number }>;
}

export interface MyRank {
  rank: number | null;
  totalTokens: number;
  rewardCount: number;
}

export type LeaderboardPeriod = 'all' | 'week' | 'month';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  tokenCost: number;
  category: string;
  metadata: unknown;
  active: boolean;
}

export interface StorePurchase {
  id: string;
  spentAmount: number;
  createdAt: string;
  item: { id: string; name: string; description: string; category: string; metadata: unknown };
}

export interface ReferralInfo {
  referralCode: string | null;
  totalReferrals: number;
  referrals: Array<{ id: string; displayName: string | null; photoUrl: string | null; createdAt: string }>;
}

export interface SeasonalSnapshot {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  data?: Array<{ rank: number; userId: string; displayName: string; totalTokens: number; rewardCount: number }>;
}

const BADGE_META: Record<string, { name: string; description: string; icon: string }> = {
  EARLY_ADOPTER: { name: 'Early Adopter', description: 'Earned first approved translation', icon: '🌟' },
  TOP_TRANSLATOR: { name: 'Top Translator', description: 'Completed 10+ approved translations', icon: '🏆' },
  CULTURE_CURATOR: { name: 'Culture Curator', description: 'Contributed cultural context to 5+ translations', icon: '🎭' },
  COMMUNITY_HELPER: { name: 'Community Helper', description: 'Created 10+ community topics or comments', icon: '🤝' },
  ARTIST_SPOTLIGHT: { name: 'Artist Spotlight', description: 'Verified artist on the platform', icon: '🎵' },
  DAILY_STREAK_7: { name: 'Dedicated', description: 'Logged in for 7 consecutive days', icon: '🔥' },
  FIRST_PROFILE: { name: 'Profile Pro', description: 'Completed profile setup', icon: '👤' },
  GENEROUS_SUPPORTER: { name: 'Generous Supporter', description: 'Purchased 3+ store items', icon: '🛍️' },
  SEASON_CHAMPION: { name: 'Season Champion', description: 'Top 3 on a seasonal leaderboard', icon: '👑' },
  REFERRAL_STAR: { name: 'Referral Star', description: 'Referred 3+ new users', icon: '⭐' },
  GUARDIAN: { name: 'Guardian', description: 'Resolved 10+ flagged content reports', icon: '🛡️' },
  HELPFUL_VOTER: { name: 'Helpful Voter', description: 'Cast 50+ upvotes across translations, topics, and comments', icon: '🗳️' },
  GENIUS_ARTIST: { name: 'Genius Artist', description: 'Completed 100+ approved translations or 10+ of your songs have been translated', icon: '🎓' },
  MODERATION_QUEUE: { name: 'Moderation Queue', description: 'Resolved 20+ flagged content reports', icon: '⚖️' },
  PLATINUM_ARTIST: { name: 'Platinum Artist', description: 'Published 10+ songs as a verified artist', icon: '💿' },
  FAN_FAVORITE: { name: 'Fan Favorite', description: 'Received 50+ upvotes on your translations', icon: '❤️' },
};

export function getBadgeDisplay(badgeType: string) {
  return BADGE_META[badgeType] || { name: badgeType, description: '', icon: '🏅' };
}

export const tokenApi = {
  getProfile: (userId: string) =>
    apiRequest<UserProfile>(`/users/${userId}/profile`),

  getMyTokens: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return apiRequest<TokenHistoryResponse>(`/users/me/tokens${qs ? `?${qs}` : ''}`);
  },

  getLeaderboard: (period: LeaderboardPeriod = 'all') =>
    apiRequest<LeaderboardEntry[]>(`/community/leaderboard?period=${period}`),

  getMyRank: (period: LeaderboardPeriod = 'all') =>
    apiRequest<MyRank>(`/community/leaderboard/me?period=${period}`),

  adminAdjustTokens: (userId: string, amount: number, reason: string) =>
    apiRequest<{ success: boolean; rewardId: string }>('/admin/tokens/adjust', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, reason }),
    }),

  adminRevokeBadge: (badgeId: string) =>
    apiRequest<{ success: boolean; id: string; badgeType: string; userId: string }>(
      `/admin/badges/${badgeId}`,
      { method: 'DELETE' },
    ),

  adminGetRewards: (page?: number, limit?: number, userId?: string, search?: string) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (userId) params.set('userId', userId);
    if (search) params.set('search', search);
    const qs = params.toString();
    return apiRequest<{ data: AdminRewardEntry[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/admin/rewards${qs ? `?${qs}` : ''}`,
    );
  },

  adminGetRewardStats: () =>
    apiRequest<AdminRewardStats>('/admin/rewards/stats'),

  getStoreItems: () =>
    apiRequest<StoreItem[]>('/store/items'),

  purchaseItem: (itemId: string) =>
    apiRequest<{ success: boolean; message: string }>('/store/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    }),

  getMyPurchases: () =>
    apiRequest<StorePurchase[]>('/store/me/purchases'),

  getMyReferrals: () =>
    apiRequest<ReferralInfo>('/referrals/me'),

  getReferralCode: () =>
    apiRequest<{ code: string }>('/referrals/code', { method: 'POST' }),

  applyReferral: (code: string) =>
    apiRequest<{ success: boolean; message: string }>('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getSeasonalSnapshots: () =>
    apiRequest<SeasonalSnapshot[]>('/leaderboard/seasons'),

  getSeasonalSnapshot: (id: string) =>
    apiRequest<SeasonalSnapshot>(`/leaderboard/seasons/${id}`),
};
