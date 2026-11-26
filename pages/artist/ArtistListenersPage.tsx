import React, { useEffect, useState } from 'react';
import { apiRequest, artistListenerRegionsApi } from '../../services/api';
import ListenerStats from '../../components/artist/listeners/ListenerStats';
import GeographicBreakdown, { Region } from '../../components/artist/listeners/GeographicBreakdown';
import ListenerTrends from '../../components/artist/listeners/ListenerTrends';
import TopCities, { City } from '../../components/artist/listeners/TopCities';

interface AnalyticsData {
  totalPlays: number;
  totalUniqueListeners: number;
  series: { date: string; uniqueListeners: number }[];
}

interface RegionData {
  totalListeners: number;
  regions: Region[];
  cities: City[];
}

function getTopRegion(regions: Region[]): string {
  if (regions.length === 0) return '—';
  return regions[0].name;
}

function calcAvgPlaysPerListener(totalPlays: number, totalListeners: number): string {
  if (totalListeners === 0) return '—';
  const avg = totalPlays / totalListeners;
  return avg < 10 ? avg.toFixed(1) : Math.round(avg).toString();
}

const ArtistListenersPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [regions, setRegions] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [analyticsData, regionData] = await Promise.all([
          apiRequest<AnalyticsData>('/artists/me/analytics?rangeDays=90'),
          artistListenerRegionsApi.getRegions(90).catch(() => null),
        ]);
        setAnalytics(analyticsData);
        setRegions(regionData);
      } catch (error) {
        console.error('Error fetching listener data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Listeners</h1>
        <p className="text-gray-400 mt-1">Understand who your audience is and where they come from</p>
      </div>

      {/* Stat Cards */}
      <ListenerStats
        totalListeners={analytics?.totalUniqueListeners ?? regions?.totalListeners ?? 0}
        topRegion={getTopRegion(regions?.regions ?? [])}
        avgListenTime={calcAvgPlaysPerListener(analytics?.totalPlays ?? 0, analytics?.totalUniqueListeners ?? 0)}
        loading={loading}
      />

      {/* Two-column layout: Geographic + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeographicBreakdown regions={regions?.regions ?? []} loading={loading} />
        <TopCities cities={regions?.cities ?? []} loading={loading} />
      </div>

      {/* Full-width listener trends */}
      <ListenerTrends series={analytics?.series ?? []} loading={loading} />
    </div>
  );
};

export default ArtistListenersPage;
