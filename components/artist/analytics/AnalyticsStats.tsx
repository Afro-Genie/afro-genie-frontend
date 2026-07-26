import React from 'react';
import { Play, Users, BarChart3, Zap } from 'lucide-react';

interface AnalyticsStatsProps {
  totalPlays: number;
  totalTranslationViews: number;
  totalUniqueListeners: number;
  totalSongs: number;
  loading?: boolean;
}

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const AnalyticsStats: React.FC<AnalyticsStatsProps> = ({
  totalPlays,
  totalTranslationViews,
  totalUniqueListeners,
  totalSongs,
  loading,
}) => {
  const avgPlaysPerSong = totalSongs > 0 ? Math.round(totalPlays / totalSongs) : 0;

  const stats = [
    {
      label: 'Total Plays',
      value: formatCompact(totalPlays),
      icon: <Play className="w-5 h-5" />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      change: `${totalSongs} songs`,
    },
    {
      label: 'Translation Views',
      value: formatCompact(totalTranslationViews),
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      change: 'Lyrics translations',
    },
    {
      label: 'Unique Listeners',
      value: formatCompact(totalUniqueListeners),
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      change: 'Distinct listeners',
    },
    {
      label: 'Avg. Plays / Song',
      value: formatCompact(avgPlaysPerSong),
      icon: <Zap className="w-5 h-5" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      change: 'Per song average',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 hover:border-green-500/30 transition-all hover:bg-gray-800/80"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={stat.color}>{stat.icon}</div>
          </div>
          <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
          <p className="text-xs text-gray-500">{stat.change}</p>
        </div>
      ))}
    </div>
  );
};

export default AnalyticsStats;
