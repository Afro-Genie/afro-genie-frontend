import React from 'react';
import { Music, Disc3, ListMusic } from 'lucide-react';

interface MusicStatsProps {
  totalReleases: number;
  totalStreams: number;
  totalSongs: number;
  loading?: boolean;
}

const formatCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const MusicStats: React.FC<MusicStatsProps> = ({
  totalReleases,
  totalStreams,
  totalSongs,
  loading,
}) => {
  const stats = [
    { icon: Music, label: 'Total Releases', value: formatCompact(totalReleases), subtext: 'Songs released' },
    { icon: Disc3, label: 'Total Streams', value: formatCompact(totalStreams), subtext: 'All time' },
    { icon: ListMusic, label: 'Total Songs', value: formatCompact(totalSongs), subtext: 'In catalog' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-800/50 border border-gray-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtext}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-green-400" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MusicStats;
