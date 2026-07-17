import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, roleRequestsApi } from '../services/api';
import type { RoleRequest, RequestedRole, RoleRequestStatus } from '../services/api';
import { spotifyAuthService } from '../services/spotifyAuthService';

const RoleUpgradeSection: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RequestedRole>('ARTIST');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [artistFields, setArtistFields] = useState({
    stageName: '',
    genre: '',
    bio: '',
  });

  const [moderatorFields, setModeratorFields] = useState({
    reason: '',
    experience: '',
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await roleRequestsApi.list();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch role requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const fields = selectedRole === 'ARTIST' ? artistFields : moderatorFields;
      await roleRequestsApi.submit(selectedRole, fields, notes || undefined);
      setSuccess('Role request submitted successfully! It will be reviewed by an admin.');
      setShowForm(false);
      setNotes('');
      if (selectedRole === 'ARTIST') {
        setArtistFields({ stageName: '', genre: '', bio: '' });
      } else {
        setModeratorFields({ reason: '', experience: '' });
      }
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit role request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: RoleRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-yellow-900/50 text-yellow-300 rounded-full border border-yellow-700/50">
            <svg className="w-3 h-3 mr-1.5 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="4" />
            </svg>
            Pending
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-900/50 text-blue-300 rounded-full border border-blue-700/50">
            <svg className="w-3 h-3 mr-1.5 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="4" />
            </svg>
            Under Review
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded-full border border-green-700/50">
            <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-red-900/50 text-red-300 rounded-full border border-red-700/50">
            <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Rejected
          </span>
        );
    }
  };

  const hasPendingRequest = (role: RequestedRole) =>
    requests.some((r) => r.role === role && (r.status === 'PENDING' || r.status === 'UNDER_REVIEW'));

  const canRequestRole = (role: RequestedRole) => {
    if (userProfile?.role === role.toLowerCase()) return false;
    return !hasPendingRequest(role);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-4 bg-gray-700 rounded w-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Available Upgrades</h3>
          <p className="text-gray-400 text-sm mt-1">Request a role upgrade to access additional features</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Request Role
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-100 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`p-4 rounded-lg border ${userProfile?.role === 'artist' ? 'bg-purple-900/20 border-purple-700/50' : 'bg-gray-700/30 border-gray-600'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Artist</h4>
            {userProfile?.role === 'artist' ? (
              <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded">Current Role</span>
            ) : hasPendingRequest('ARTIST') ? (
              <span className="text-xs text-yellow-300 bg-yellow-900/50 px-2 py-0.5 rounded">Request Pending</span>
            ) : null}
          </div>
          <p className="text-gray-400 text-sm">Upload songs, manage your artist profile, and access analytics.</p>
        </div>

        <div className={`p-4 rounded-lg border ${userProfile?.role === 'moderator' ? 'bg-blue-900/20 border-blue-700/50' : 'bg-gray-700/30 border-gray-600'}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Moderator</h4>
            {userProfile?.role === 'moderator' ? (
              <span className="text-xs text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded">Current Role</span>
            ) : hasPendingRequest('MODERATOR') ? (
              <span className="text-xs text-yellow-300 bg-yellow-900/50 px-2 py-0.5 rounded">Request Pending</span>
            ) : null}
          </div>
          <p className="text-gray-400 text-sm">Help moderate community content and manage translation requests.</p>
        </div>
      </div>

      {/* Application Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Role</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('ARTIST')}
                disabled={!canRequestRole('ARTIST')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === 'ARTIST'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${!canRequestRole('ARTIST') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Artist
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('MODERATOR')}
                disabled={!canRequestRole('MODERATOR')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === 'MODERATOR'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${!canRequestRole('MODERATOR') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Moderator
              </button>
            </div>
          </div>

          {selectedRole === 'ARTIST' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stage Name *</label>
                <input
                  type="text"
                  value={artistFields.stageName}
                  onChange={(e) => setArtistFields({ ...artistFields, stageName: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Your artist/stage name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Primary Genre *</label>
                <input
                  type="text"
                  value={artistFields.genre}
                  onChange={(e) => setArtistFields({ ...artistFields, genre: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Afrobeats, Amapiano, Highlife"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bio *</label>
                <textarea
                  value={artistFields.bio}
                  onChange={(e) => setArtistFields({ ...artistFields, bio: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Tell us about yourself as an artist"
                />
              </div>
            </>
          )}

          {selectedRole === 'MODERATOR' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Why do you want to be a moderator? *</label>
                <textarea
                  value={moderatorFields.reason}
                  onChange={(e) => setModeratorFields({ ...moderatorFields, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Explain your interest in moderating the community"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Relevant Experience</label>
                <textarea
                  value={moderatorFields.experience}
                  onChange={(e) => setModeratorFields({ ...moderatorFields, experience: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Any moderation or community management experience"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Additional Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Optional: any additional information"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); setSuccess(''); }}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Your Requests</h4>
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium capitalize">{req.role.toLowerCase()}</span>
                {getStatusBadge(req.status)}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(req.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AccountPage: React.FC = () => {
  const { user, userProfile, isSpotifyPremium, refreshSpotifyProduct, logout } = useAuth();
  const navigate = useNavigate();
  const [spotifyProfile, setSpotifyProfile] = useState<{ displayName: string; email: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const code = err.code || '';
      const message = err.message || 'Failed to change password';

      if (code === 'UNAUTHORIZED') {
        setPasswordError('Current password is incorrect');
      } else if (code === 'CONFLICT') {
        setPasswordError('This account does not have a password. Use your sign-in provider to manage your credentials.');
      } else {
        setPasswordError(message);
      }
    } finally {
      setPasswordLoading(false);
    }
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

        {/* Change Password */}
        <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>

          {passwordSuccess && (
            <div className="bg-green-900/50 border border-green-700 text-green-100 px-4 py-3 rounded-lg mb-4 text-sm">
              Password updated successfully. You may need to sign in again on other devices.
            </div>
          )}

          {passwordError && (
            <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-4 text-sm">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 min-h-[44px] text-base bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Re-enter new password"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors min-h-[44px]"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
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

        {/* Role Upgrade */}
        {userProfile?.role === 'user' && (
          <section className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <RoleUpgradeSection />
          </section>
        )}

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
