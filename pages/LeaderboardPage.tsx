import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tokenApi, type LeaderboardEntry, type MyRank, type LeaderboardPeriod } from '../services/tokenService';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  2: 'bg-gray-300/10 border-gray-400/40 text-gray-300',
  3: 'bg-orange-700/15 border-orange-600/40 text-orange-400',
};

const RANK_ICONS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const PERIOD_TABS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: LeaderboardPeriod) => {
    setLoading(true);
    try {
      const [board, rank] = await Promise.all([
        tokenApi.getLeaderboard(p),
        user ? tokenApi.getMyRank(p).catch(() => null) : Promise.resolve(null),
      ]);
      setEntries(board);
      setMyRank(rank);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-gray-400">Top contributors by token balance</p>
        </div>

        {/* Period Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* My Rank Card */}
        {myRank && myRank.rank !== null && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700/30 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-green-400 font-medium">Your Rank</p>
              <p className="text-2xl font-bold text-white">#{myRank.rank}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                {myRank.totalTokens}
              </div>
              <p className="text-xs text-gray-500">{myRank.rewardCount} rewards</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500">No contributors yet. Start translating to earn tokens!</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => {
              const rankStyle = RANK_STYLES[entry.rank] || 'bg-gray-800/50 border-gray-700 text-gray-300';
              const rankIcon = RANK_ICONS[entry.rank] || `#${entry.rank}`;
              const isMe = user?.id === entry.userId;

              return (
                <Link
                  key={entry.userId}
                  to={`/users/${entry.userId}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors hover:opacity-80 ${rankStyle} ${isMe ? 'ring-2 ring-green-500/50' : ''}`}
                >
                  <div className="w-8 text-center font-bold text-lg flex-shrink-0">
                    {entry.rank <= 3 ? rankIcon : (
                      <span className="text-gray-500 text-sm">{entry.rank}</span>
                    )}
                  </div>

                  {entry.photoUrl ? (
                    <img
                      src={entry.photoUrl}
                      alt={entry.displayName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">
                        {entry.displayName?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {entry.displayName}
                      {isMe && <span className="ml-2 text-xs text-green-400">(you)</span>}
                    </p>
                    <p className="text-xs opacity-60">{entry.rewardCount} rewards</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                      {entry.totalTokens}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
