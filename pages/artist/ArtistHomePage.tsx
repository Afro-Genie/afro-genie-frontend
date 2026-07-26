import React, { useEffect, useState } from 'react';
import { apiRequest, artistListenerRegionsApi } from '../../services/api';
import StatCards from '../../components/artist/dashboard/StatCards';
import StreamChart from '../../components/artist/dashboard/StreamChart';
import TopTracks from '../../components/artist/dashboard/TopTracks';
import TopRegions from '../../components/artist/dashboard/TopRegions';

interface ArtistProfile {
  stageName?: string;
  name?: string;
  followers?: number;
}

interface AnalyticsSeries {
  date: string;
  plays: number;
  translationViews: number;
  uniqueListeners: number;
}

interface AnalyticsData {
  totalPlays: number;
  totalTranslationViews: number;
  totalUniqueListeners: number;
  series: AnalyticsSeries[];
  topSongs: {
    id: string;
    title: string;
    views: number;
    requestCount: number;
    imageUrl?: string;
  }[];
}

const ArtistHomePage: React.FC = () => {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [regions, setRegions] = useState<{ name: string; listeners: number; percentage: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, analyticsData, regionData] = await Promise.all([
          apiRequest<ArtistProfile>('/artists/me/profile'),
          apiRequest<AnalyticsData>('/artists/me/analytics?rangeDays=30'),
          artistListenerRegionsApi.getRegions(30).catch(() => null),
        ]);
        setProfile(profileData);
        setAnalytics(analyticsData);
        setRegions(regionData?.regions ?? []);
      } catch (error) {
        console.error('Error fetching artist home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const artistName = profile?.stageName || profile?.name || 'Artist';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {artistName}
        </h1>
        <p className="text-gray-400 mt-1">Here's your overview</p>
      </div>

      {/* Stat Cards */}
      <StatCards
        totalPlays={analytics?.totalPlays ?? 0}
        totalListeners={analytics?.totalUniqueListeners ?? 0}
        totalFollowers={profile?.followers ?? 0}
        loading={loading}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StreamChart series={analytics?.series ?? []} loading={loading} />
        </div>
        <div>
          <TopRegions regions={regions} loading={loading} />
        </div>
      </div>

      {/* Top Tracks */}
      <TopTracks tracks={analytics?.topSongs ?? []} loading={loading} />
    </div>
  );
};

export default ArtistHomePage;
