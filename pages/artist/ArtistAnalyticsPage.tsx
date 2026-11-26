import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import ArtistTranslationReachChart from '../../components/artist/analytics/ArtistTranslationReachChart';
import TopSongsByTranslationImpact from '../../components/artist/analytics/TopSongsByTranslationImpact';
import DemandHeatmap from '../../components/artist/analytics/DemandHeatmap';
import QualityTrustPanel from '../../components/artist/analytics/QualityTrustPanel';
import AudienceUnderstandingPanel from '../../components/artist/analytics/AudienceUnderstandingPanel';

interface AnalyticsData {
  rangeDays: number;
  summary: { translationViews:number; translationReaders:number; returningReaders:number; translationRequests:number; fulfilledRequests:number; approvalRate:number; correctionOpened:number; correctionResolved:number; avgResolutionHours:number; downvoteRate:number; lyricsViews:number; translatedSongViews:number };
  reachSeries: Array<{ date:string; translationViews:number; translationReaders:number; returningReaders:number }>;
  topSongs: Array<{ id:string; title:string; translationViews:number; requests:number; completionRate:number; upvoteRatio:number; languages:number }>;
  demandHeatmap: Array<{ songId:string; title:string; targetLang:string; count:number }>;
  qualityTrust: { approvalRate:number; correctionOpened:number; correctionResolved:number; avgResolutionHours:number; downvoteRate:number };
  audienceUnderstanding: { countries:Array<{country:string;views:number}>; languages:Array<{language:string;views:number}>; returningReaders:number; translationReaders:number; translatedSongViews:number; lyricsOnlyViews:number };
}

const Stat: React.FC<{label:string; value:string|number; hint:string}> = ({label,value,hint}) => (
  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5"><div className="text-xs text-gray-400">{label}</div><div className="text-2xl font-bold text-white mt-1">{value}</div><div className="text-xs text-gray-500 mt-1">{hint}</div></div>
);

const ArtistAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<AnalyticsData>(`/artists/me/analytics?rangeDays=${rangeDays}`);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [rangeDays]);

  const s = analytics?.summary;
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Translation Analytics</h1>
          <p className="text-gray-400 mt-1">Understand how your music travels across languages and cultures.</p>
        </div>
        <div className="flex gap-2">
          {[7,30,90].map((days) => (
            <button key={days} onClick={() => setRangeDays(days)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${rangeDays===days ? 'bg-green-600 text-white' : 'bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:bg-gray-700'}`}>{days} days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Translation Views" value={s?.translationViews ?? 0} hint="Views on translated lyrics" />
        <Stat label="Translation Readers" value={s?.translationReaders ?? 0} hint="Unique readers" />
        <Stat label="Returning Readers" value={s?.returningReaders ?? 0} hint="Readers coming back" />
        <Stat label="Fulfilled Requests" value={`${s?.fulfilledRequests ?? 0}/${s?.translationRequests ?? 0}`} hint="Translation demand fulfilled" />
      </div>

      <ArtistTranslationReachChart series={analytics?.reachSeries ?? []} loading={loading} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopSongsByTranslationImpact songs={analytics?.topSongs ?? []} loading={loading} />
        <DemandHeatmap cells={analytics?.demandHeatmap ?? []} loading={loading} />
      </div>
      <QualityTrustPanel data={analytics?.qualityTrust ?? { approvalRate:0, correctionOpened:0, correctionResolved:0, avgResolutionHours:0, downvoteRate:0 }} loading={loading} />
      <AudienceUnderstandingPanel data={analytics?.audienceUnderstanding ?? { countries:[], languages:[], returningReaders:0, translationReaders:0, translatedSongViews:0, lyricsOnlyViews:0 }} loading={loading} />
    </div>
  );
};

export default ArtistAnalyticsPage;
