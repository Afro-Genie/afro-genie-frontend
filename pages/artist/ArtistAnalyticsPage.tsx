import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import AnalyticsStats from '../../components/artist/analytics/AnalyticsStats';
import PlaysLineChart from '../../components/artist/analytics/PlaysLineChart';
import TopSongsChart from '../../components/artist/analytics/TopSongsChart';
import DayOfWeekChart from '../../components/artist/analytics/DayOfWeekChart';
import ListenerGrowthChart from '../../components/artist/analytics/ListenerGrowthChart';

interface AnalyticsData {
  totalPlays: number;
  totalTranslationViews: number;
  totalUniqueListeners: number;
  series: { date: string; plays: number; translationViews: number; uniqueListeners: number }[];
  topSongs: { id: string; title: string; views: number; requestCount: number; imageUrl?: string }[];
}

const ArtistAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(90);

  useEffect(() => {
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
    fetchAnalytics();
  }, [rangeDays]);

  const totalSongs = analytics?.topSongs?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Track your performance and audience growth</p>
        </div>
        <div className="flex gap-2">
          {[30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                rangeDays === days
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <AnalyticsStats
        totalPlays={analytics?.totalPlays ?? 0}
        totalTranslationViews={analytics?.totalTranslationViews ?? 0}
        totalUniqueListeners={analytics?.totalUniqueListeners ?? 0}
        totalSongs={totalSongs}
        loading={loading}
      />

      {/* Main chart */}
      <PlaysLineChart series={analytics?.series ?? []} loading={loading} />

      {/* Secondary charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopSongsChart
          songs={(analytics?.topSongs ?? []).map((s) => ({ title: s.title, views: s.views }))}
          loading={loading}
        />
        <DayOfWeekChart series={analytics?.series ?? []} loading={loading} />
      </div>

      {/* Listener growth */}
      <ListenerGrowthChart series={analytics?.series ?? []} loading={loading} />
    </div>
  );
};

export default ArtistAnalyticsPage;
