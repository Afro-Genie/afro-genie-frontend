import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { TrendingUpIcon, StatsIcon } from '../../components/icons/FlatIcons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface AnalyticsData {
  totalPlays: number;
  totalTranslationViews: number;
  totalUniqueListeners: number;
  series: { date: string; plays: number }[];
  topSongs: { title: string; views: number }[];
}

const ArtistAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(90);

  useEffect(() => {
    fetchAnalytics();
  }, [rangeDays]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<AnalyticsData>(
        `/artists/me/analytics?rangeDays=${rangeDays}`
      );
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const topSongs = (analytics?.topSongs ?? [])
    .slice()
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Track your performance</p>
        </div>
        <div className="flex gap-2">
          {[30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                rangeDays === days
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Plays</p>
              <p className="text-3xl font-bold text-white mt-1">
                {(analytics?.totalPlays ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-green-500/10 rounded-full p-3">
              <TrendingUpIcon className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Translation Views</p>
              <p className="text-3xl font-bold text-white mt-1">
                {(analytics?.totalTranslationViews ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-500/10 rounded-full p-3">
              <StatsIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Unique Listeners</p>
              <p className="text-3xl font-bold text-white mt-1">
                {(analytics?.totalUniqueListeners ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Plays Over Time</h2>
        {analytics?.series && analytics.series.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={analytics.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6',
                }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <Line
                type="monotone"
                dataKey="plays"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-12">No play data available</p>
        )}
      </div>

      {topSongs.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Songs by Views</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSongs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis
                type="category"
                dataKey="title"
                stroke="#9CA3AF"
                fontSize={12}
                width={150}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6',
                }}
              />
              <Bar dataKey="views" fill="#22C55E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ArtistAnalyticsPage;
