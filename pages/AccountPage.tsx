import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, artistApplicationApi, roleRequestsApi } from '../services/api';
import { usePendingRequests } from '../hooks/usePendingRequests';
import UserNotificationSettings, { NotificationToggles } from '../components/user/settings/UserNotificationSettings';
import UserDataSettings from '../components/user/settings/UserDataSettings';
import UserDangerZone from '../components/user/settings/UserDangerZone';
import ImageUpload from '../components/ImageUpload';
import {
  User,
  CheckCircle,
  Camera,
  Save,
  History,
  Heart,
  Music2,
  Clock,
  ExternalLink,
  Loader2,
  Gift,
} from 'lucide-react';
import { tokenApi, type UserEntitlement } from '../services/tokenService';

interface HistoryEntry {
  songId: string;
  songTitle: string;
  artistName: string;
  viewedAt: string;
}

interface FavoriteEntry {
  id: string;
  songId: string;
  songTitle: string;
  artistName: string;
  createdAt: string;
}

const AccountPage: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { artistApplication, roleRequests, refresh: refreshPending } = usePendingRequests();
  const [cancellingArtist, setCancellingArtist] = useState(false);
  const [cancellingRole, setCancellingRole] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');

  // Profile editing state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // History & favorites state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [entitlements, setEntitlements] = useState<UserEntitlement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingEntitlements, setLoadingEntitlements] = useState(true);

  // Sync displayName/photoUrl when user changes
  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setPhotoUrl(user?.photoURL || '');
  }, [user?.displayName, user?.photoURL]);

  const handleCancelArtistApplication = async () => {
    if (!artistApplication) return;
    if (!window.confirm('Are you sure you want to cancel your artist application?')) return;
    setCancellingArtist(true);
    setCancelError('');
    try {
      await artistApplicationApi.cancel();
      await refreshPending();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel artist application.');
    } finally {
      setCancellingArtist(false);
    }
  };

  const handleCancelRoleRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    setCancellingRole(id);
    setCancelError('');
    try {
      await roleRequestsApi.cancel(id);
      await refreshPending();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel request.');
    } finally {
      setCancellingRole(null);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch history
  useEffect(() => {
    if (!user) return;
    setLoadingHistory(true);
    apiRequest<HistoryEntry[]>('/users/history')
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [user]);

  // Fetch favorites
  useEffect(() => {
    if (!user) return;
    setLoadingFavorites(true);
    apiRequest<FavoriteEntry[]>('/users/favorites')
      .then(setFavorites)
      .catch(() => {})
      .finally(() => setLoadingFavorites(false));
  }, [user]);

  // Fetch entitlements (store rewards)
  useEffect(() => {
    if (!user) return;
    setLoadingEntitlements(true);
    tokenApi
      .getMyEntitlements()
      .then(setEntitlements)
      .catch(() => {})
      .finally(() => setLoadingEntitlements(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    try {
      await apiRequest('/users/me', { method: 'DELETE' });
    } catch {
      // Non-fatal: logout regardless
    }
    await logout();
    navigate('/');
  };

  const handleSaveNotifications = async (toggles: NotificationToggles) => {
    localStorage.setItem('user_notifications', JSON.stringify(toggles));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await apiRequest('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ displayName, photoUrl }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSavingProfile(false);
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

  const prettifyEntitlement = (ent: UserEntitlement): string => {
    const meta = ent.metadata && typeof ent.metadata === 'object' && !Array.isArray(ent.metadata) ? (ent.metadata as Record<string, unknown>) : {};
    const name = typeof meta.itemName === 'string' ? meta.itemName : null;
    if (name) return name;
    const type = ent.type || '';
    return type
      .replace(/^(avatar:)?border:/i, '')
      .replace(/^(title:)/i, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getBorderColor = (type: string): string | null => {
    const t = type.toLowerCase();
    if (t.includes('amber')) return 'border-amber-400';
    if (t.includes('gold')) return 'border-yellow-400';
    if (t.includes('sapphire')) return 'border-blue-400';
    if (t.includes('emerald')) return 'border-emerald-400';
    if (t.includes('border')) return 'border-amber-400';
    return null;
  };

  const getTitleChips = (ents: UserEntitlement[]): string[] => {
    return ents
      .filter((e) => e.type.toLowerCase().startsWith('title:'))
      .map((e) => prettifyEntitlement(e))
      .slice(0, 2);
  };

  const lastBorder = entitlements
    .filter((e) => e.type.toLowerCase().includes('border'))
    .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())[0];

  const borderColor = lastBorder ? getBorderColor(lastBorder.type) : null;

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-green-900/40 via-green-800/20 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-5">
            <div className={`w-20 h-20 rounded-full bg-gray-800 border-4 ${borderColor || 'border-gray-900'} overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg`}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-9 h-9 text-gray-500" />
              )}
            </div>
            <div className="pb-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-2xl font-bold text-white truncate">{user.displayName || 'User'}</h1>
                {getTitleChips(entitlements).map((t) => (
                  <span key={t} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-900/50 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-sm truncate">{user.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 pb-1">
              <span className="px-2.5 py-1 text-xs font-medium bg-green-900/50 text-green-300 rounded-full capitalize">
                {user.role}
              </span>
              <span className="text-xs text-gray-500">
                Member since {formatMemberSince(userProfile?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Profile Editing */}
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500/50 transition-colors"
                  placeholder="Your display name"
                />
              </div>
              <ImageUpload
                label="Profile Photo"
                currentUrl={photoUrl || undefined}
                onUploaded={(url) => setPhotoUrl(url)}
              />
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-all text-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                {profileSaved && (
                  <span className="text-green-400 text-sm">Profile updated!</span>
                )}
              </div>
            </div>
          </div>

          {/* Store Rewards */}
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Store Rewards</h2>
              </div>
              {entitlements.length > 0 && (
                <span className="text-xs text-gray-500">{entitlements.length} items</span>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loadingEntitlements ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
                </div>
              ) : entitlements.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 text-sm">No rewards yet</p>
                  <Link
                    to="/store"
                    className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block"
                  >
                    Visit store
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-700/50">
                  {entitlements.map((ent) => (
                    <li key={ent.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{prettifyEntitlement(ent)}</p>
                        <p className="text-xs text-gray-500">
                          Granted {new Date(ent.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {ent.type.toLowerCase().startsWith('title:') ? (
                        <span className="ml-3 px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-900/50 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                          Title
                        </span>
                      ) : ent.type.toLowerCase().includes('border') ? (
                        <span className="ml-3 px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                          Border
                        </span>
                      ) : (
                        <span className="ml-3 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-800/60 text-gray-400 border border-gray-700/50 whitespace-nowrap">
                          Item
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Liked Songs */}
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-semibold text-white">Liked Songs</h2>
              </div>
              {favorites.length > 0 && (
                <span className="text-xs text-gray-500">{favorites.length} songs</span>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loadingFavorites ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
                </div>
              ) : favorites.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 text-sm">No liked songs yet</p>
                  <Link
                    to="/songs"
                    className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block"
                  >
                    Browse songs
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-700/50">
                  {favorites.map((fav) => (
                    <li key={fav.id}>
                      <Link
                        to={`/songs/${fav.songId}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                      >
                        <Music2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{fav.songTitle}</p>
                          <p className="text-xs text-gray-400 truncate">{fav.artistName}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-6 text-center">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
                </div>
              ) : history.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500 text-sm">No activity yet</p>
                  <Link
                    to="/songs"
                    className="text-green-400 text-sm hover:text-green-300 mt-1 inline-block"
                  >
                    Start exploring
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-700/50">
                  {history.map((entry, idx) => (
                    <li key={`${entry.songId}-${idx}`}>
                      <Link
                        to={`/songs/${entry.songId}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                      >
                        <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{entry.songTitle}</p>
                          <p className="text-xs text-gray-400 truncate">{entry.artistName}</p>
                        </div>
                        <span className="text-xs text-gray-600 flex-shrink-0 whitespace-nowrap">
                          {timeAgo(entry.viewedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {(artistApplication || roleRequests.length > 0) && (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {cancelError && (
              <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg text-sm">
                {cancelError}
              </div>
            )}

            {artistApplication && (
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <p className="text-white font-medium">Artist Application</p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-amber-400">{artistApplication.status.replace('_', ' ')}</span>
                    {' '}&middot; Applied {new Date(artistApplication.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={handleCancelArtistApplication}
                  disabled={cancellingArtist}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancellingArtist ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            )}

            {roleRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div>
                  <p className="text-white font-medium">{req.role === 'MODERATOR' ? 'Moderator Request' : 'Role Request'}</p>
                  <p className="text-gray-400 text-sm">
                    <span className="text-blue-400">{req.status.replace('_', ' ')}</span>
                    {' '}&middot; Submitted {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleCancelRoleRequest(req.id)}
                  disabled={cancellingRole === req.id}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancellingRole === req.id ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Cards */}
      <UserNotificationSettings onSave={handleSaveNotifications} />
      <UserDataSettings />
      <UserDangerZone onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />
    </div>
  );
};

export default AccountPage;
