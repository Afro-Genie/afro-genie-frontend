import React from 'react';
import { Play, Users, Heart } from 'lucide-react';

interface StatCardData {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}

interface StatCardsProps {
  totalPlays: number;
  totalListeners: number;
  totalFollowers: number;
  loading?: boolean;
}

const formatValue = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const StatCards: React.FC<StatCardsProps> = ({
  totalPlays,
  totalListeners,
  totalFollowers,
  loading,
}) => {
  const stats: StatCardData[] = [
    {
      label: 'Streams',
      value: formatValue(totalPlays),
      change: 'Total all time',
      icon: <Play className="w-5 h-5" />,
    },
    {
      label: 'Listeners',
      value: formatValue(totalListeners),
      change: 'Unique listeners',
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Followers',
      value: formatValue(totalFollowers),
      change: 'Total followers',
      icon: <Heart className="w-5 h-5" />,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 hover:border-green-500/30 transition-all hover:bg-gray-800/80"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="text-green-400">{stat.icon}</div>
          </div>
          <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
          <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
          <p className="text-xs text-gray-500">{stat.change}</p>
        </div>
      ))}
    </div>
  );
};

export default StatCards;
