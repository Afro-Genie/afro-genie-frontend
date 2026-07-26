import React from 'react';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Region {
  name: string;
  listeners: number;
  percentage: number;
}

interface TopRegionsProps {
  regions: Region[];
  loading?: boolean;
}

const TopRegions: React.FC<TopRegionsProps> = ({ regions, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="h-6 w-40 bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="text-green-400 w-5 h-5" />
        <h2 className="text-xl font-bold text-white">Top Regions</h2>
      </div>

      {regions.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No region data available yet.</p>
      ) : (
        <div className="space-y-4">
          {regions.map((region) => (
            <div key={region.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{region.name}</span>
                <span className="text-sm text-gray-400">{region.listeners.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-700/30 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400/60 h-full rounded-full transition-all"
                  style={{ width: `${region.percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 mt-1 block">{region.percentage}%</span>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/artist/listeners"
        className="block w-full mt-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm text-center transition-colors"
      >
        View Details
      </Link>
    </div>
  );
};

export default TopRegions;
