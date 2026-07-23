import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { StatsIcon, MusicNoteIcon, TrendingUpIcon } from '../../components/icons/FlatIcons';

interface ArtistProfile {
  id: string;
  stageName: string;
  bio: string;
  verified: boolean;
  notifications?: { id: string; message: string; createdAt: string; read: boolean }[];
  songs?: any[];
}

interface ArtistAnalytics {
  totalPlays: number;
  totalTranslationViews: number;
  totalUniqueListeners: number;
  series: { date: string; plays: number }[];
}

const ArtistOverviewPage: React.FC = () => {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [analytics, setAnalytics] = useState<ArtistAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, analyticsData] = await Promise.all([
          apiRequest<ArtistProfile>('/artists/me/profile'),
          apiRequest<ArtistAnalytics>('/artists/me/analytics?rangeDays=30'),
        ]);
        setProfile(profileData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error fetching artist overview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Plays',
      value: analytics?.totalPlays ?? 0,
      icon: TrendingUpIcon,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Total Songs',
      value: profile?.songs?.length ?? 0,
      icon: MusicNoteIcon,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Translation Views',
      value: analytics?.totalTranslationViews ?? 0,
      icon: StatsIcon,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  const notifications = profile?.notifications ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {profile?.stageName || 'Artist'}
        </h1>
        <p className="text-gray-400 mt-1">Here&apos;s your overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-gray-800 border border-gray-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {card.value.toLocaleString()}
                </p>
              </div>
              <div className={`${card.bg} rounded-full p-3`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Notifications</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No notifications yet</p>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 10).map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  notif.read ? 'bg-gray-700/30' : 'bg-gray-700/60 border border-gray-600'
                }`}
              >
                <div
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    notif.read ? 'bg-gray-500' : 'bg-green-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistOverviewPage;
