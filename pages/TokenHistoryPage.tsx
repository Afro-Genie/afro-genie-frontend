import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenApi, type TokenReward, type TokenHistoryResponse } from '../services/tokenService';

const REASON_ICONS: Record<string, string> = {
  'Translation approved': '✍️',
  'Translation upvoted': '👍',
  'Translation request fulfilled': '📋',
  'Topic created': '💬',
  'Comment created': '💭',
};

const TokenHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<TokenHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchTokens = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await tokenApi.getMyTokens(p, 20);
      setData(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchTokens(page);
  }, [user, page, navigate, fetchTokens]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Token History</h1>
            <p className="text-sm text-gray-400 mt-1">Your earned token rewards</p>
          </div>
          <Link
            to="/leaderboard"
            className="px-4 py-2 text-sm font-medium text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
          >
            Leaderboard
          </Link>
        </div>

        {loading && !data && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && data && data.rewards.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🌟</p>
            <p className="text-gray-400 mb-2">No tokens yet</p>
            <p className="text-sm text-gray-500">
              Earn tokens by translating songs, voting, and contributing to the community.
            </p>
          </div>
        )}

        {!loading && data && data.rewards.length > 0 && (
          <>
            <div className="space-y-2">
              {data.rewards.map((reward) => (
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
                  <span className="text-sm font-bold text-amber-400 flex-shrink-0">
                    +{reward.amount}
                  </span>
                </div>
              ))}
            </div>

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                  className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TokenHistoryPage;
