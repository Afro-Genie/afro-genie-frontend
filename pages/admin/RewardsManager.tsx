import React, { useState, useEffect, useCallback } from 'react';
import { tokenApi, getBadgeDisplay, type AdminRewardEntry, type AdminRewardStats } from '../../services/tokenService';

const RewardsManager: React.FC = () => {
  const [stats, setStats] = useState<AdminRewardStats | null>(null);
  const [rewards, setRewards] = useState<AdminRewardEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const s = await tokenApi.adminGetRewardStats();
      setStats(s);
    } catch {
      // silent
    }
  }, []);

  const fetchRewards = useCallback(async (page = 1, q?: string) => {
    setLoading(true);
    try {
      const result = await tokenApi.adminGetRewards(page, 20, undefined, q);
      setRewards(result.data);
      setPagination(result.pagination);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRewards(1);
  }, [fetchStats, fetchRewards]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(adjustAmount, 10);
    if (!adjustUserId.trim() || isNaN(amount) || !adjustReason.trim()) return;

    setAdjusting(true);
    setMessage(null);
    try {
      await tokenApi.adminAdjustTokens(adjustUserId.trim(), amount, adjustReason.trim());
      setMessage({ type: 'success', text: `Successfully ${amount > 0 ? 'awarded' : 'deducted'} ${Math.abs(amount)} tokens` });
      setAdjustUserId('');
      setAdjustAmount('');
      setAdjustReason('');
      fetchStats();
      fetchRewards(pagination.page);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to adjust tokens' });
    } finally {
      setAdjusting(false);
    }
  };

  const handleRevokeBadge = async (badgeId: string, badgeType: string) => {
    if (!window.confirm(`Revoke the ${getBadgeDisplay(badgeType).name} badge?`)) return;
    try {
      await tokenApi.adminRevokeBadge(badgeId);
      setMessage({ type: 'success', text: 'Badge revoked' });
      fetchStats();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke badge' });
    }
  };

  const handleSearch = () => {
    fetchRewards(1, search.trim() || undefined);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Rewards & Badges</h1>
        <p className="text-gray-400 mt-1">Manage token adjustments, badge revocations, and view reward history.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-red-900/50 text-red-300 border border-red-700/50'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-400">Total Rewards</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalRewards.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-400">Tokens Distributed</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{stats.totalTokensDistributed.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-400">Badges Awarded</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{stats.totalBadges}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-400">Top Reward Reason</p>
            <p className="text-sm font-semibold text-white mt-1 truncate">
              {stats.topReasons[0]?.reason || '—'}
            </p>
            <p className="text-xs text-gray-500">{stats.topReasons[0]?.count || 0} times</p>
          </div>
        </div>
      )}

      {/* Manual Token Adjustment */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Manual Token Adjustment</h2>
        <form onSubmit={handleAdjust} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="User ID"
            value={adjustUserId}
            onChange={(e) => setAdjustUserId(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            required
          />
          <input
            type="number"
            placeholder="Amount (+/-)"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            min={-1000}
            max={1000}
            className="w-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            required
          />
          <input
            type="text"
            placeholder="Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            maxLength={255}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500"
            required
          />
          <button
            type="submit"
            disabled={adjusting}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {adjusting ? 'Processing...' : 'Adjust'}
          </button>
        </form>
      </div>

      {/* Reward Audit Log */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Reward Audit Log</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search reason or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 w-64"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rewards.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No rewards found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Reason</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-gray-700/30">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {reward.user.photoUrl ? (
                            <img src={reward.user.photoUrl} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
                              <span className="text-xs text-white">{reward.user.displayName?.[0] || '?'}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-white">{reward.user.displayName || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{reward.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`font-semibold ${reward.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {reward.amount > 0 ? '+' : ''}{reward.amount}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300 max-w-xs truncate">{reward.reason}</td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">
                        {new Date(reward.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchRewards(pagination.page - 1, search.trim() || undefined)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchRewards(pagination.page + 1, search.trim() || undefined)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RewardsManager;
