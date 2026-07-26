import React from 'react';
import { MapPin } from 'lucide-react';

export interface City {
  name: string;
  country: string;
  listeners: number;
  percentage: number;
}

interface TopCitiesProps {
  cities: City[];
  loading?: boolean;
}

const TopCities: React.FC<TopCitiesProps> = ({ cities, loading }) => {
  const maxListeners = Math.max(...cities.map((c) => c.listeners), 1);

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-white">Top Cities</h2>
        </div>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gray-700/50 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse" />
                  <div className="h-3 w-48 bg-gray-700/50 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No city data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cities.map((city, idx) => (
              <div
                key={`${city.name}-${city.country}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-xs font-bold text-gray-300">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{city.name}</p>
                  <p className="text-xs text-gray-400">{city.country}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-24 bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-teal-500 transition-all duration-700"
                      style={{ width: `${(city.listeners / maxListeners) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400 w-16 text-right">{city.listeners.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCities;
