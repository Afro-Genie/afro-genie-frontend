import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import {
  SaveIcon,
  CheckIcon,
  SearchIcon,
  CancelIcon,
} from '../../components/icons/FlatIcons';

interface ArtistProfile {
  id: string;
  stageName: string;
  bio: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
  spotifyArtistId?: string;
  verified: boolean;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
  };
}

interface SpotifyResult {
  id: string;
  name: string;
  images?: { url: string }[];
  genres?: string[];
}

const ArtistProfileSettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    bio: '',
    profileImageUrl: '',
    bannerImageUrl: '',
    spotifyArtistId: '',
    instagram: '',
    twitter: '',
    youtube: '',
    facebook: '',
  });

  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([]);
  const [spotifySearching, setSpotifySearching] = useState(false);
  const [showSpotifySearch, setShowSpotifySearch] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiRequest<ArtistProfile>('/artists/me/profile');
      setProfile(data);
      setForm({
        bio: data.bio || '',
        profileImageUrl: data.profileImageUrl || '',
        bannerImageUrl: data.bannerImageUrl || '',
        spotifyArtistId: data.spotifyArtistId || '',
        instagram: data.socialLinks?.instagram || '',
        twitter: data.socialLinks?.twitter || '',
        youtube: data.socialLinks?.youtube || '',
        facebook: data.socialLinks?.facebook || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/artists/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio: form.bio,
          profileImageUrl: form.profileImageUrl || undefined,
          bannerImageUrl: form.bannerImageUrl || undefined,
          spotifyArtistId: form.spotifyArtistId || undefined,
          socialLinks: {
            instagram: form.instagram || undefined,
            twitter: form.twitter || undefined,
            youtube: form.youtube || undefined,
            facebook: form.facebook || undefined,
          },
        }),
      });
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSpotifySearch = async () => {
    if (!spotifyQuery.trim()) return;
    setSpotifySearching(true);
    try {
      const results = await apiRequest<SpotifyResult[]>(
        '/artists/me/spotify-search',
        {
          method: 'POST',
          body: JSON.stringify({ query: spotifyQuery }),
        }
      );
      setSpotifyResults(results);
    } catch (error) {
      console.error('Error searching Spotify:', error);
    } finally {
      setSpotifySearching(false);
    }
  };

  const handleSelectSpotify = (result: SpotifyResult) => {
    setForm({ ...form, spotifyArtistId: result.id });
    setShowSpotifySearch(false);
    setSpotifyResults([]);
    setSpotifyQuery('');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-800 rounded-xl w-64" />
        <div className="h-96 bg-gray-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-400 mt-1">Manage your public artist profile</p>
        </div>
        {profile?.verified && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/50 text-green-300 border border-green-700/50 rounded-full text-sm font-medium">
            <CheckIcon className="w-4 h-4" />
            Verified
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Profile Info</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Tell the world about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Profile Image URL
            </label>
            <input
              type="url"
              value={form.profileImageUrl}
              onChange={(e) => setForm({ ...form, profileImageUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://example.com/profile.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Banner Image URL
            </label>
            <input
              type="url"
              value={form.bannerImageUrl}
              onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://example.com/banner.jpg"
            />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Spotify</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Spotify Artist ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.spotifyArtistId}
                onChange={(e) => setForm({ ...form, spotifyArtistId: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. 0hCNtX0MhhZ5ToVgD0Pl5W"
              />
              <button
                type="button"
                onClick={() => setShowSpotifySearch(!showSpotifySearch)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <SearchIcon className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {showSpotifySearch && (
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={spotifyQuery}
                  onChange={(e) => setSpotifyQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSpotifySearch())}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search artist name..."
                />
                <button
                  type="button"
                  onClick={handleSpotifySearch}
                  disabled={spotifySearching}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm"
                >
                  {spotifySearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {spotifyResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {spotifyResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSpotify(result)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-600 transition-colors text-left"
                    >
                      {result.images?.[0] ? (
                        <img
                          src={result.images[0].url}
                          alt={result.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{result.name}</p>
                        {result.genres && result.genres.length > 0 && (
                          <p className="text-xs text-gray-400">
                            {result.genres.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Social Links</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Instagram</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Twitter/X</label>
              <input
                type="text"
                value={form.twitter}
                onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">YouTube</label>
              <input
                type="text"
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Channel URL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Facebook</label>
              <input
                type="text"
                value={form.facebook}
                onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Page URL"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <SaveIcon className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default ArtistProfileSettingsPage;
