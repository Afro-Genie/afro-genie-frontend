import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import ListenerTrends from '../../components/artist/listeners/ListenerTrends';
import ProfileHeader from '../../components/artist/profile/ProfileHeader';
import ProfileAbout from '../../components/artist/profile/ProfileAbout';
import ProfileContact from '../../components/artist/profile/ProfileContact';
import ProfileSocial from '../../components/artist/profile/ProfileSocial';
import Achievements from '../../components/artist/profile/Achievements';
import RecentActivity from '../../components/artist/profile/RecentActivity';
import ImageUpload from '../../components/ImageUpload';

interface ArtistProfile {
  id: string;
  stageName: string;
  bio: string;
  genres: string[];
  profileImageUrl?: string;
  bannerImageUrl?: string;
  verified: boolean;
  totalStreams: number;
  totalListeners: number;
  totalFollowers: number;
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
  };
}

interface AnalyticsData {
  totalUniqueListeners: number;
  series: { date: string; uniqueListeners: number }[];
}

const ArtistProfileSettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [profileData, analyticsData] = await Promise.all([
          apiRequest<ArtistProfile>('/artists/me/profile'),
          apiRequest<AnalyticsData>('/artists/me/analytics?rangeDays=90').catch(() => null),
        ]);
        setProfile(profileData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSaveBio = async (bio: string) => {
    await apiRequest('/artists/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ bio }),
    });
    setProfile((prev) => (prev ? { ...prev, bio } : prev));
  };

  const handleSaveContact = async (contact: { email?: string; phone?: string; location?: string }) => {
    await apiRequest('/artists/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ contact }),
    });
    setProfile((prev) => (prev ? { ...prev, contact } : prev));
  };

  const handleSaveSocial = async (socialLinks: ArtistProfile['socialLinks']) => {
    await apiRequest('/artists/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ socialLinks }),
    });
    setProfile((prev) => (prev ? { ...prev, socialLinks } : prev));
  };

  const handleUploadProfileImage = async (url: string) => {
    await apiRequest('/artists/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ profileImageUrl: url }),
    });
    setProfile((prev) => (prev ? { ...prev, profileImageUrl: url } : prev));
  };

  const handleUploadBannerImage = async (url: string) => {
    await apiRequest('/artists/me/profile', {
      method: 'PUT',
      body: JSON.stringify({ bannerImageUrl: url }),
    });
    setProfile((prev) => (prev ? { ...prev, bannerImageUrl: url } : prev));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ProfileHeader
        stageName={profile?.stageName ?? ''}
        bio={profile?.bio ?? ''}
        genres={profile?.genres ?? []}
        profileImageUrl={profile?.profileImageUrl}
        bannerImageUrl={profile?.bannerImageUrl}
        verified={profile?.verified ?? false}
        totalStreams={profile?.totalStreams ?? 0}
        totalListeners={profile?.totalListeners ?? 0}
        totalFollowers={profile?.totalFollowers ?? 0}
        loading={loading}
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <ProfileAbout
            bio={profile?.bio ?? ''}
            onSave={handleSaveBio}
            loading={loading}
          />
          <ProfileContact
            contact={profile?.contact ?? {}}
            onSave={handleSaveContact}
            loading={loading}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Profile Images</h3>
            <ImageUpload
              label="Profile Photo"
              currentUrl={profile?.profileImageUrl}
              onUploaded={handleUploadProfileImage}
            />
            <ImageUpload
              label="Banner Image"
              currentUrl={profile?.bannerImageUrl}
              onUploaded={handleUploadBannerImage}
            />
          </div>
          <ProfileSocial
            socialLinks={profile?.socialLinks ?? {}}
            onSaveSocial={handleSaveSocial}
            loading={loading}
          />
          <ListenerTrends series={analytics?.series ?? []} loading={loading} />
        </div>
      </div>

      {/* Achievements */}
      <Achievements
        totalStreams={profile?.totalStreams ?? 0}
        totalListeners={profile?.totalListeners ?? 0}
        totalFollowers={profile?.totalFollowers ?? 0}
        loading={loading}
      />

      {/* Recent Activity */}
      <RecentActivity loading={loading} />
    </div>
  );
};

export default ArtistProfileSettingsPage;
