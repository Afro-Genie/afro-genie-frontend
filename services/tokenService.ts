import { apiRequest } from './api';

export interface TokenReward {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  type?: string;
  balanceAfter?: number;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: unknown;
}

export interface TokenSummary {
  earned: number;
  spent: number;
  penalized: number;
  adjusted: number;
}

export interface TokenHistoryResponse {
  rewards: TokenReward[];
  summary?: TokenSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BalanceResponse {
  balance: number;
  translationCredits?: number;
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
  description: string | null;
  tokenCost: number;
  category: string;
  digital?: boolean;
  metadata: unknown;
  active: boolean;
  featured?: boolean;
  limitedTime?: boolean;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  discountPercent?: number | null;
  promoStartsAt?: string | null;
  promoEndsAt?: string | null;
  sortOrder?: number;
  stock?: number | null;
  owned?: boolean;
}

export interface LimitedTimeOffer extends StoreItem {
  timeRemainingMs: number;
}

export interface GtBundle {
  id: string;
  name: string;
  gtAmount: number;
  priceKobo: number;
  currency: string;
  badge: string | null;
  bonusPercent: number;
  sortOrder: number;
  active: boolean;
}

export type GtPurchaseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface GtPurchase {
  id: string;
  bundleName: string;
  gtAmount: number;
  amountKobo: number;
  currency: string;
  status: GtPurchaseStatus;
  paidAt: string | null;
  creditedAt: string | null;
  createdAt: string;
}

export interface GtPurchaseHistory {
  purchases: GtPurchase[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface InitializePaymentResponse {
  access_code: string;
  reference: string;
  authorization_url: string;
  gtAmount: number;
  amountKobo: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  gtCredited: number;
  newBalance: number | null;
  status: string;
  alreadyCredited: boolean;
}

export type PassType = 'SEVEN_DAY_PREMIUM' | 'TRANSLATION_PACK_10' | 'TRANSLATION_PACK_50';

export interface PassCatalogEntry {
  type: PassType;
  gtCost: number;
  label: string;
}

export interface PremiumPass {
  id: string;
  userId: string;
  type: PassType;
  purchasedAt: string;
  expiresAt: string;
  gtCost: number;
  active: boolean;
}

export interface StorePurchase {
  id: string;
  spentAmount: number;
  status: string;
  createdAt: string;
  item: { id: string; name: string; description: string | null; category: string; metadata: unknown };
}

export interface UserEntitlement {
  id: string;
  userId: string;
  type: string;
  grantedAt: string;
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
  topThree?: Array<{ rank: number; userId: string; displayName: string; photoUrl: string | null; totalTokens: number }>;
  data?: Array<{ rank: number; userId: string; displayName: string; totalTokens: number; rewardCount: number }>;
}

export interface AdminStoreItem {
  id: string;
  name: string;
  description: string | null;
  tokenCost: number;
  category: string;
  metadata: unknown;
  active: boolean;
  featured: boolean;
  limitedTime: boolean;
  originalPrice: number | null;
  discountedPrice: number | null;
  discountPercent: number | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  sortOrder: number;
  stock: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStorePurchase {
  id: string;
  spentAmount: number;
  status: string;
  createdAt: string;
  item: { id: string; name: string; category: string };
  user: { id: string; displayName: string | null; email: string };
}

export interface AdminStorePurchasePage {
  data: AdminStorePurchase[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
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

  getMyTokens: (page?: number, limit?: number, type?: string) => {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (type) params.set('type', type);
    const qs = params.toString();
    return apiRequest<TokenHistoryResponse>(`/users/me/tokens${qs ? `?${qs}` : ''}`);
  },

  getMyBalance: () =>
    apiRequest<BalanceResponse>('/users/me/balance'),

  completeProfile: (data: { displayName: string; photoUrl?: string; bio?: string; preferredLanguages?: string[] }) =>
    apiRequest<{ id: string; displayName: string | null; photoUrl: string | null; bio: string | null; preferredLanguages: string[]; profileCompleted: boolean; bonusAwarded: boolean }>(
      '/users/me/complete-profile',
      { method: 'POST', body: JSON.stringify(data) },
    ),

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

  adminGetStoreItems: (active?: boolean) => {
    const qs = active === undefined ? '' : `?active=${active}`;
    return apiRequest<AdminStoreItem[]>(`/admin/store/items${qs}`);
  },

  adminCreateStoreItem: (data: {
    name: string;
    description?: string;
    tokenCost: number;
    category: string;
    metadata?: Record<string, unknown>;
    active?: boolean;
    featured?: boolean;
    limitedTime?: boolean;
    sortOrder?: number;
    stock?: number | null;
  }) =>
    apiRequest<AdminStoreItem>('/admin/store/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminUpdateStoreItem: (
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      tokenCost: number;
      category: string;
      metadata: Record<string, unknown> | null;
      active: boolean;
      featured: boolean;
      limitedTime: boolean;
      sortOrder: number;
      stock: number | null;
    }>,
  ) =>
    apiRequest<AdminStoreItem>(`/admin/store/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  adminDeleteStoreItem: (id: string) =>
    apiRequest<{ success: boolean }>(`/admin/store/items/${id}`, { method: 'DELETE' }),

  adminGetStorePurchases: (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return apiRequest<AdminStorePurchasePage>(`/admin/store/purchases?${params.toString()}`);
  },

  adminFulfillPurchase: (id: string) =>
    apiRequest<AdminStorePurchase>(`/admin/store/purchases/${id}/fulfill`, { method: 'PATCH' }),

  getStoreItems: () =>
    apiRequest<StoreItem[]>('/store/items'),

  getFeaturedStoreItems: () =>
    apiRequest<StoreItem[]>('/store/featured'),

  getLimitedTimeOffers: () =>
    apiRequest<LimitedTimeOffer[]>('/store/offers'),

  purchaseItem: (itemId: string) => {
    const purchaseToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return apiRequest<StorePurchase>('/store/purchase', {
      method: 'POST',
      body: JSON.stringify({ itemId, purchaseToken }),
    });
  },

  getMyPurchases: () =>
    apiRequest<StorePurchase[]>('/store/me/purchases'),

  adminApplyDiscount: (id: string, discountPercent: number, promoEndsAt?: string | null) =>
    apiRequest<AdminStoreItem>(`/admin/store/items/${id}/discount`, {
      method: 'POST',
      body: JSON.stringify({ discountPercent, promoEndsAt: promoEndsAt ?? null }),
    }),

  adminClearDiscount: (id: string) =>
    apiRequest<AdminStoreItem>(`/admin/store/items/${id}/discount`, { method: 'DELETE' }),

  // --- GT payments (Phase 2) ---

  getGtBundles: () =>
    apiRequest<GtBundle[]>('/payments/bundles'),

  initializeGtPurchase: (bundleId: string) =>
    apiRequest<InitializePaymentResponse>('/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ bundleId }),
    }),

  verifyGtPurchase: (reference: string) =>
    apiRequest<VerifyPaymentResponse>(`/payments/verify/${encodeURIComponent(reference)}`),

  getGtPurchaseHistory: (page = 1, limit = 20) =>
    apiRequest<GtPurchaseHistory>(`/payments/history?page=${page}&limit=${limit}`),

  // --- Premium passes (Phase 2) ---

  getPassCatalog: () =>
    apiRequest<PassCatalogEntry[]>('/tokens/passes'),

  purchasePass: (passType: PassType) =>
    apiRequest<{ passId: string; type: PassType; label: string; expiresAt: string; newBalance: number; translationCredits: number }>(
      '/tokens/purchase-pass',
      { method: 'POST', body: JSON.stringify({ passType }) },
    ),

  getActivePass: () =>
    apiRequest<PremiumPass | null>('/tokens/active-pass'),

  getMyEntitlements: () =>
    apiRequest<UserEntitlement[]>('/store/entitlements'),

  getMyReferrals: () =>
    apiRequest<ReferralInfo>('/referrals'),

  getReferralCode: () =>
    apiRequest<{ referralCode: string }>('/referrals/code', { method: 'POST' }),

  applyReferral: (code: string) =>
    apiRequest<{ success: boolean; message: string }>('/referrals/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getSeasonalSnapshots: () =>
    apiRequest<SeasonalSnapshot[]>('/community/leaderboard/seasons'),

  getSeasonalSnapshot: (id: string) =>
    apiRequest<SeasonalSnapshot>(`/community/leaderboard/seasons/${id}`),
};
