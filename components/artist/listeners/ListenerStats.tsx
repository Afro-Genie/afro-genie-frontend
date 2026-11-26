import React from 'react';
import { Users, Globe, BarChart3 } from 'lucide-react';

interface ListenerStatsProps {
  totalListeners: number;
  topRegion: string;
  avgListenTime: string;
  loading?: boolean;
}

const stats = [
  { key: 'listeners', label: 'Total Listeners', icon: Users, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', gradient: 'from-green-500/10 to-transparent' },
  { key: 'region', label: 'Top Region', icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', gradient: 'from-emerald-500/10 to-transparent' },
  { key: 'avgtime', label: 'Avg. Plays/Listener', icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', gradient: 'from-teal-500/10 to-transparent' },
];

const ListenerStats: React.FC<ListenerStatsProps> = ({ totalListeners, topRegion, avgListenTime, loading }) => {
  const values: Record<string, string> = {
    listeners: totalListeners.toLocaleString(),
    region: topRegion,
    avgtime: avgListenTime,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.key} className={`bg-gray-900/50 border ${stat.border} rounded-xl p-5 relative overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {loading ? <div className="h-7 w-20 bg-gray-700/50 rounded animate-pulse" /> : values[stat.key]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ListenerStats;
