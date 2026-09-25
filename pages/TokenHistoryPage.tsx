import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenApi, type TokenHistoryResponse, type GtPurchase } from '../services/tokenService';

const REASON_ICONS: Record<string, string> = {
  'AI translation generated': '🤖',
  'Correction approved': '✍️',
  'Daily login': '📅',
  'Login streak bonus': '🔥',
  'Welcome bonus': '🎁',
  'Profile completed': '👤',
  'Topic shared': '🔗',
  'Translation approved': '✍️',
  'Translation upvoted': '👍',
  'Translation request fulfilled': '📋',
  'Topic created': '💬',
  'Comment created': '💭',
  'Referral bonus': '🤝',
};

type TypeFilter = '' | 'EARN' | 'SPEND' | 'PENALTY' | 'TAX' | 'ADMIN_ADJUST';

const TYPE_FILTERS: TypeFilter[] = ['', 'EARN', 'SPEND', 'PENALTY', 'TAX', 'ADMIN_ADJUST'];

const SUMMARY_STYLES: Record<string, { label: string; cls: string }> = {
  earned: { label: 'Earned', cls: 'text-amber-400' },
  spent: { label: 'Spent', cls: 'text-red-400' },
  penalized: { label: 'Penalized', cls: 'text-orange-400' },
  adjusted: { label: 'Adjusted', cls: 'text-sky-400' },
};

const PAGE_SIZE = 20;

const TokenHistoryPage: React.FC = () => {
  const { user, balance } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<TokenHistoryResponse | null>(null);
  const [rewards, setRewards] = useState<TokenHistoryResponse['rewards']>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<TypeFilter>('');
  const [hasMore, setHasMore] = useState(false);
  const [purchases, setPurchases] = useState<GtPurchase[]>([]);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchTokens = useCallback(async (p: number, t: TypeFilter, append: boolean) => {
    loadingRef.current = true;
    setLoading(true);
    try {
      const result = await tokenApi.getMyTokens(p, PAGE_SIZE, t || undefined);
      setData(result);
      setRewards((prev) => (append ? [...prev, ...result.rewards] : result.rewards));
      setHasMore(p < result.pagination.totalPages);
    } catch {
      // silent
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    pageRef.current = 1;
    setHasMore(false);
    fetchTokens(1, type, false);
  }, [user, type, navigate, fetchTokens]);

  // Infinite scroll: load the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          const next = pageRef.current + 1;
          pageRef.current = next;
          fetchTokens(next, type, true);
        }
      },
      { rootMargin: '300px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, type, fetchTokens]);

  useEffect(() => {
    if (!user) return;
    tokenApi
      .getGtPurchaseHistory(1, 5)
      .then((result) => setPurchases(result.purchases))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const summary = data?.summary;
  const summaryKeys = summary ? (Object.keys(summary) as Array<keyof typeof summary>) : [];

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">GT History</h1>
            <p className="text-sm text-gray-400 mt-1">Your Genie Token (GT) activity</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="px-4 py-2 text-sm font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              to="/buy-gt"
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Buy GT
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex-1 min-w-[180px] p-4 bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl">
            <p className="text-xs text-amber-300/80 uppercase tracking-wide">Current balance</p>
            <p className="text-3xl font-bold text-amber-400 mt-1 tabular-nums">
              {balance ?? 0} <span className="text-base font-semibold">GT</span>
            </p>
          </div>
          {summaryKeys.map((key) => {
            const meta = SUMMARY_STYLES[key] ?? { label: key, cls: 'text-gray-300' };
            return (
              <div key={key} className="flex-1 min-w-[120px] p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{meta.label}</p>
                <p className={`text-xl font-bold mt-1 tabular-nums ${meta.cls}`}>
                  {summary ? summary[key] : 0}
                </p>
              </div>
            );
          })}
        </div>

        {(balance ?? 0) < 100 && (
          <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 rounded-xl">
            <div>
              <p className="text-sm text-white font-medium">Running low on GT?</p>
              <p className="text-xs text-gray-400">Top up instantly with Paystack to keep translating.</p>
            </div>
            <Link
              to="/buy-gt"
              className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Buy GT
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                type === t
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:text-gray-200'
              }`}
            >
              {t === '' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading && rewards.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && rewards.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🌟</p>
            <p className="text-gray-400 mb-2">No GT activity yet</p>
            <p className="text-sm text-gray-500">
              Earn GT by translating songs, voting, and contributing to the community.
            </p>
          </div>
        )}

        {rewards.length > 0 && (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg"
              >
                <span className="text-xl flex-shrink-0">
                  {REASON_ICONS[reward.reason] || '⭐'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{reward.reason}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(reward.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`block text-sm font-bold ${reward.amount >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {reward.amount >= 0 ? '+' : ''}{reward.amount} GT
                  </span>
                  {typeof reward.balanceAfter === 'number' && (
                    <span className="block text-[10px] text-gray-500 tabular-nums">
                      balance {reward.balanceAfter}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
        {purchases.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">GT Purchases</h2>
              <Link to="/buy-gt" className="text-xs text-amber-400 hover:text-amber-300">
                Buy more →
              </Link>
            </div>
            <div className="space-y-2">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-white">{p.bundleName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-amber-400 font-medium">+{p.gtAmount} GT</p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        p.status === 'COMPLETED'
                          ? 'bg-green-900/50 text-green-300'
                          : p.status === 'FAILED'
                          ? 'bg-red-900/50 text-red-300'
                          : 'bg-amber-900/50 text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenHistoryPage;