import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import NotificationSettings from '../../components/artist/settings/NotificationSettings';
import AccountSettings from '../../components/artist/settings/AccountSettings';
import SubscriptionInfo from '../../components/artist/settings/SubscriptionInfo';
import DangerZone from '../../components/artist/settings/DangerZone';
import PrivacySettings from '../../components/artist/settings/PrivacySettings';
import AudioSettings from '../../components/artist/settings/AudioSettings';
import DataSettings from '../../components/artist/settings/DataSettings';

interface ArtistProfile {
  email: string;
  spotifyArtistId?: string;
  plan?: string;
}

const ArtistSettingsPage: React.FC = () => {
  const { logout, isSpotifyPremium } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiRequest<ArtistProfile>('/artists/me/profile');
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    await apiRequest('/artists/me/account', { method: 'DELETE' });
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-48 bg-gray-800 rounded-xl" />
          <div className="h-64 bg-gray-800 rounded-xl" />
          <div className="h-32 bg-gray-800 rounded-xl" />
        </div>
      ) : (
        <>
          <SubscriptionInfo
            plan={profile?.plan ?? 'FREE'}
            isSpotifyPremium={isSpotifyPremium}
          />
          <NotificationSettings onSave={async (toggles) => {
            localStorage.setItem('artist_notifications', JSON.stringify(toggles));
          }} />
          <PrivacySettings />
          <AudioSettings />
          <DataSettings />
          <AccountSettings
            email={profile?.email ?? ''}
            isSpotifyLinked={!!profile?.spotifyArtistId}
          />
          <DangerZone
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        </>
      )}
    </div>
  );
};

export default ArtistSettingsPage;
