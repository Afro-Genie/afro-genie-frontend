import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { moderationApi, ReportStats, ModStats } from '../../services/moderationService';

const ModDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [modStats, setModStats] = useState<ModStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rs, ms] = await Promise.all([
          moderationApi.getReportStats(),
          moderationApi.getModStats(user!.uid),
        ]);
        setReportStats(rs);
        setModStats(ms);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) load();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Pending Reports', value: reportStats?.pending ?? 0, color: 'bg-yellow-900/50 text-yellow-300', link: '/moderator/reports' },
    { label: 'Resolved Reports', value: reportStats?.resolved ?? 0, color: 'bg-green-900/50 text-green-300', link: '/moderator/reports' },
    { label: 'Tokens Earned', value: modStats?.totalTokensEarned ?? 0, color: 'bg-blue-900/50 text-blue-300' },
    { label: 'Badges Earned', value: modStats?.badges?.length ?? 0, color: 'bg-purple-900/50 text-purple-300' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Moderator Dashboard</h1>
      <p className="text-gray-400 mb-8">Welcome back, {user?.displayName || 'Moderator'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) =>
          card.link ? (
            <Link key={card.label} to={card.link} className={`${card.color} rounded-lg p-6 hover:opacity-90 transition-opacity`}>
              <p className="text-sm opacity-80 mb-1">{card.label}</p>
              <p className="text-3xl font-bold">{card.value}</p>
            </Link>
          ) : (
            <div key={card.label} className={`${card.color} rounded-lg p-6`}>
              <p className="text-sm opacity-80 mb-1">{card.label}</p>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickActionLink to="/moderator/reports" label="Review Reports" desc="Pending content reports" />
            <QuickActionLink to="/moderator/translations" label="Review Translations & Corrections" desc="Pending approvals, corrections, and correction requests" />
            <QuickActionLink to="/moderator/lyrics" label="Edit Lyrics" desc="Update song lyrics" />
            <QuickActionLink to="/moderator/users" label="New Users" desc="Recent signups" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Your Activity</h2>
          {modStats ? (
            <div className="space-y-3">
              <ActivityRow label="Reports Resolved" value={modStats.reportsResolved} />
              <ActivityRow label="Translations Approved" value={modStats.translationsApproved} />
              <ActivityRow label="Corrections Approved" value={modStats.correctionsApproved} />
              <ActivityRow label="Token Balance" value={modStats.currentTokenBalance} />
            </div>
          ) : (
            <p className="text-gray-400">No activity yet.</p>
          )}
        </div>
      </div>

      {modStats && (
        <>
          <h2 className="text-2xl font-bold text-white mt-8 mb-4">Detailed Stats</h2>
          {renderDetailStatCards(modStats)}

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Badges</h2>
            {modStats.badges.length === 0 ? (
              <p className="text-gray-400">No badges earned yet. Keep moderating to earn badges!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {modStats.badges.map((badge) => (
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
              <BadgeProgress label="GUARDIAN" current={modStats.reportsResolved} target={10} />
              <BadgeProgress label="MODERATION_QUEUE" current={modStats.reportsResolved} target={20} />
            </div>
          </div>
        </>
      )}
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

function renderDetailStatCards(stats: ModStats) {
  const cards = [
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className={`${card.color} rounded-lg p-5`}>
          <p className="text-sm opacity-80 mb-1">{card.label}</p>
          <p className="text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

const QuickActionLink: React.FC<{ to: string; label: string; desc: string }> = ({ to, label, desc }) => (
  <Link to={to} className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-3 transition-colors">
    <div>
      <p className="text-white font-medium">{label}</p>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </Link>
);

const ActivityRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-300">{label}</span>
    <span className="text-white font-bold">{value}</span>
  </div>
);

export default ModDashboard;
