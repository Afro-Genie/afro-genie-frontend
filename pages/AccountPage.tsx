import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { spotifyAuthService } from '../services/spotifyAuthService';

const AccountPage: React.FC = () => {
  const { user, userProfile, isSpotifyPremium, refreshSpotifyProduct, logout } = useAuth();
  const navigate = useNavigate();
  const [spotifyProfile, setSpotifyProfile] = useState<{ displayName: string; email: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.spotifyId) return;

    const loadSpotifyProfile = async () => {
      try {
        const token = spotifyAuthService.getStoredAccessToken();
        if (token) {
          const profile = await spotifyAuthService.getUserProfile(token);
          setSpotifyProfile({
            displayName: profile.display_name,
            email: profile.email,
          });
        }
      } catch {
        // Non-fatal: we just won't show the Spotify name/email
      }
    };

    loadSpotifyProfile();
  }, [user?.spotifyId]);

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleConnectSpotify = async () => {
    try {
      const { url } = await spotifyAuthService.getAuthorizationUrl({ action: 'link' });
      sessionStorage.setItem('spotify_redirect_after_auth', window.location.pathname);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to initiate Spotify link:', error);
    }
  };

  const handleRecheckStatus = async () => {
    setRefreshing(true);
    try {
      await refreshSpotifyProduct();
      setLastChecked(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  const formatMemberSince = (createdAt: any): string => {
    if (!createdAt) return 'Unknown';
    try {
      if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        return new Date(createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      if (createdAt.seconds) {
        return new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {
      // fall through
    }
    return 'Unknown';
  };

  const SpotifySvg = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#122118] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>

        {/* Profile Info */}
        <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Display Name</label>
              <p className="text-white">{user.displayName || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <p className="text-white">{user.email || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Role</label>
              <p className="text-white capitalize">{user.role}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Member Since</label>
              <p className="text-white">{formatMemberSince(userProfile?.createdAt)}</p>
            </div>
          </div>
        </section>

        {/* Spotify Connection */}
        <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Spotify Connection</h2>

          {!user.spotifyId ? (
            /* Not linked */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="bg-gray-700/50 p-4 rounded-full border border-gray-600">
                  <SpotifySvg />
                </div>
              </div>
              <h3 className="text-white font-semibold mb-2">Connect Spotify Account</h3>
              <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">
                Link your Spotify account to enable full-track playback and Premium features
              </p>
              <button
                onClick={handleConnectSpotify}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
              >
                <SpotifySvg />
                Connect Spotify
              </button>
            </div>
          ) : (
            /* Linked — show status for both premium and non-premium */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-full ${isSpotifyPremium ? 'bg-green-500/20' : 'bg-gray-700/50'}`}>
                  <SpotifySvg />
                </div>
                <div className="min-w-0">
                  {spotifyProfile ? (
                    <>
                      <p className="text-white font-medium truncate">{spotifyProfile.displayName}</p>
                      <p className="text-gray-400 text-sm truncate">{spotifyProfile.email}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm">Spotify account linked</p>
                  )}
                </div>
              </div>

              {/* Premium status badge */}
              <div className="flex items-center gap-2 mb-3">
                {isSpotifyPremium ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded-full">
                    <SpotifySvg />
                    Spotify Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-700/50 text-gray-300 rounded-full">
                    Spotify Free
                  </span>
                )}
                {lastChecked && (
                  <span className="text-xs text-gray-500">
                    Checked {lastChecked.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {isSpotifyPremium ? (
                <p className="text-green-400/80 text-sm mb-4">
                  Full-track playback is available
                </p>
              ) : (
                <p className="text-gray-400 text-sm mb-4">
                  Upgrade to Spotify Premium for full-track playback
                </p>
              )}

              {/* Re-check status button — shown for ALL linked users */}
              <button
                onClick={handleRecheckStatus}
                disabled={refreshing}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  'Re-check Subscription Status'
                )}
              </button>
            </div>
          )}
        </section>

        {/* Account Actions */}
        <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Actions</h2>
          <button
            onClick={handleLogout}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-medium py-2.5 px-6 rounded-xl transition-all border border-red-600/30 min-h-[44px]"
          >
            Logout
          </button>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
