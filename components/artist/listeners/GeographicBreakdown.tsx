import React from 'react';
import { Globe } from 'lucide-react';

export interface Region {
  name: string;
  listeners: number;
  percentage: number;
}

interface GeographicBreakdownProps {
  regions: Region[];
  loading?: boolean;
}

const COLORS = [
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
];

const GeographicBreakdown: React.FC<GeographicBreakdownProps> = ({ regions, loading }) => {
  const maxListeners = Math.max(...regions.map((r) => r.listeners), 1);

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Where Your Listeners Are</h2>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-gray-700/50 rounded animate-pulse" />
                </div>
                <div className="h-2 bg-gray-700/50 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : regions.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No regional data yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {regions.map((region, idx) => {
              const barWidth = (region.listeners / maxListeners) * 100;
              return (
                <div key={region.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{region.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">{region.listeners.toLocaleString()} listeners</span>
                      <span className="text-sm font-medium text-gray-300 w-12 text-right">{region.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${COLORS[idx % COLORS.length]}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeographicBreakdown;
