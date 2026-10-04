import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  tokenApi,
  type LeaderboardEntry,
  type MyRank,
  type LeaderboardPeriod,
  type SeasonalSnapshot,
} from '../services/tokenService';
import { featureFlags } from '../config/featureFlags';

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

const formatPeriod = (period: string) => {
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'live' | 'seasons'>('live');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonalSnapshot[]>([]);
  const [activeSeason, setActiveSeason] = useState<SeasonalSnapshot | null>(null);

  const fetchLive = useCallback(async (p: LeaderboardPeriod) => {
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

  const fetchSeasons = useCallback(async (seasonId?: string) => {
    setLoading(true);
    try {
      const list = await tokenApi.getSeasonalSnapshots();
      setSeasons(list);
      if (seasonId) {
        setActiveSeason(await tokenApi.getSeasonalSnapshot(seasonId));
      } else {
        setActiveSeason(null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'live') {
      fetchLive(period);
    } else {
      fetchSeasons(activeSeason?.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, period, fetchLive, fetchSeasons]);

  const handleSelectSeason = async (seasonId: string) => {
    setActiveSeason(null);
    setLoading(true);
    try {
      setActiveSeason(await tokenApi.getSeasonalSnapshot(seasonId));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const seasonEntries =
    activeSeason?.data && typeof activeSeason.data === 'object' && Array.isArray(activeSeason.data)
      ? activeSeason.data
      : activeSeason?.topThree ?? [];

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-gray-400">Top contributors by GT balance</p>
        </div>

        {/* View Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setView('live')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'live'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            Live
          </button>
          {featureFlags.leaderboardSeasons && (
            <button
              onClick={() => setView('seasons')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                view === 'seasons'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Seasons
            </button>
          )}
        </div>

        {view === 'live' && (
          <>
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
                <p className="text-gray-500">No contributors yet. Start translating to earn GT!</p>
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
          </>
        )}

        {view === 'seasons' && (
          <>
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && seasons.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500">No season snapshots yet. Check back at the end of the month!</p>
              </div>
            )}

            {!loading && seasons.length > 0 && (
              <div className="space-y-3">
                {seasons.map((season) => {
                  const winners = Array.isArray(season.topThree) ? season.topThree : [];
                  return (
                    <div
                      key={season.id}
                      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
                    >
                      <button
                        onClick={() => handleSelectSeason(season.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-white">{formatPeriod(season.period)}</h3>
                          <span className="text-sm text-gray-500">👑 Season {season.period}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {winners.map((winner) => (
                            <div key={`${season.id}-${winner.userId}`} className="flex items-center gap-2">
                              <span className="text-xl">{RANK_ICONS[winner.rank] || `#${winner.rank}`}</span>
                              <span className="text-sm text-gray-300">{winner.displayName}</span>
                            </div>
                          ))}
                          {winners.length === 0 && (
                            <span className="text-sm text-gray-500">Click to view results</span>
                          )}
                        </div>
                      </button>

                      {activeSeason?.id === season.id && (
                        <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
                          {(seasonEntries as Array<Record<string, unknown>>).map((entry) => {
                            const rank = Number(entry.rank);
                            const rankStyle = RANK_STYLES[rank] || 'bg-gray-700/30 border-gray-700 text-gray-300';
                            return (
                              <div key={String(entry.userId)} className={`flex items-center gap-4 p-3 rounded-lg border ${rankStyle}`}>
                                <div className="w-8 text-center font-bold">
                                  {rank <= 3 ? RANK_ICONS[rank] : <span className="text-sm">{rank}</span>}
                                </div>
                                <p className="flex-1 font-medium truncate">{String(entry.displayName ?? 'Unknown')}</p>
                                <p className="text-sm font-bold text-amber-400">{Number(entry.totalTokens)}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
