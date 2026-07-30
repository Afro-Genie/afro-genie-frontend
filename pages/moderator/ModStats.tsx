import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { moderationApi, ModStats as ModStatsType } from '../../services/moderationService';

const BADGE_LABELS: Record<string, string> = {
  GUARDIAN: 'Guardian (10 reports resolved)',
  MODERATION_QUEUE: 'Moderation Queue (20 reports resolved)',
  EARLY_ADOPTER: 'Early Adopter',
  TOP_TRANSLATOR: 'Top Translator',
  CULTURE_CURATOR: 'Culture Curator',
  COMMUNITY_HELPER: 'Community Helper',
  FIRST_PROFILE: 'First Profile',
};

const BADGE_COLORS: Record<string, string> = {
  GUARDIAN: 'bg-blue-900/50 text-blue-300 border-blue-700',
  MODERATION_QUEUE: 'bg-purple-900/50 text-purple-300 border-purple-700',
};

const ModStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ModStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await moderationApi.getModStats(user!.uid);
        setStats(result);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) load();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-400 text-center py-12">Failed to load stats.</p>;
  }

  const statCards = [
    { label: 'Reports Resolved', value: stats.reportsResolved, color: 'bg-green-900/50 text-green-300' },
    { label: 'Translations Approved', value: stats.translationsApproved, color: 'bg-blue-900/50 text-blue-300' },
    { label: 'Translations Rejected', value: stats.translationsRejected, color: 'bg-red-900/50 text-red-300' },
    { label: 'Corrections Approved', value: stats.correctionsApproved, color: 'bg-purple-900/50 text-purple-300' },
    { label: 'Topics Pinned', value: stats.topicsPinned, color: 'bg-yellow-900/50 text-yellow-300' },
    { label: 'Topics Locked', value: stats.topicsLocked, color: 'bg-orange-900/50 text-orange-300' },
    { label: 'Topics Deleted', value: stats.topicsDeleted, color: 'bg-red-900/50 text-red-300' },
    { label: 'Token Balance', value: stats.currentTokenBalance, color: 'bg-cyan-900/50 text-cyan-300' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">My Moderation Stats</h1>
      <p className="text-gray-400 mb-8">Total tokens earned: {stats.totalTokensEarned}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-lg p-5`}>
            <p className="text-sm opacity-80 mb-1">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Badges</h2>
        {stats.badges.length === 0 ? (
          <p className="text-gray-400">No badges earned yet. Keep moderating to earn badges!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.badgeType}
                className={`px-4 py-3 rounded-lg border ${BADGE_COLORS[badge.badgeType] || 'bg-gray-700/50 text-gray-300 border-gray-600'}`}
              >
                <p className="font-medium">{BADGE_LABELS[badge.badgeType] || badge.badgeType}</p>
                <p className="text-xs opacity-70 mt-1">Earned: {new Date(badge.earnedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-2">Progress Toward Badges</h2>
        <p className="text-gray-400 text-sm mb-4">Complete more moderation actions to unlock badges.</p>
        <div className="space-y-3">
          <BadgeProgress label="GUARDIAN" current={stats.reportsResolved} target={10} />
          <BadgeProgress label="MODERATION_QUEUE" current={stats.reportsResolved} target={20} />
        </div>
      </div>
    </div>
  );
};

const BadgeProgress: React.FC<{ label: string; current: number; target: number }> = ({ label, current, target }) => {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-gray-400">{current} / {target} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ModStats;
