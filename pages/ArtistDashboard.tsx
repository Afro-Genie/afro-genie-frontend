import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SUPPORTED_LANGUAGES } from '../constants';
import {
  getArtistSongs,
  addSongAsArtist,
  updateArtistSong,
  deleteArtistSong,
  getArtistAnalytics,
  saveTranslation,
  getAllArtists,
  uploadImage,
  addArtist
} from '../services/firebaseService';
import { AdminListPageSkeleton } from '../components/PageSkeletons';
import type { Song, Translation } from '../types';

type TabType = 'songs' | 'add-song' | 'add-lyrics' | 'analytics' | 'profile';

const ArtistDashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('songs');
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Add Song Form
  const [songForm, setSongForm] = useState({
    title: '',
    image: '',
    imageFile: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Add Lyrics Form
  const [lyricsForm, setLyricsForm] = useState({
    songId: '',
    originalLyrics: '',
    translatedLyrics: '',
    culturalContext: '',
    sourceLang: 'en',
    targetLang: 'en'
  });
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({
    stageName: userProfile?.artistProfile?.stageName || '',
    genre: userProfile?.artistProfile?.genre || '',
    bio: userProfile?.artistProfile?.bio || '',
    location: userProfile?.artistProfile?.location || '',
    website: userProfile?.artistProfile?.website || '',
    instagram: userProfile?.artistProfile?.socialLinks?.instagram || '',
    twitter: userProfile?.artistProfile?.socialLinks?.twitter || '',
    facebook: userProfile?.artistProfile?.socialLinks?.facebook || '',
    youtube: userProfile?.artistProfile?.socialLinks?.youtube || '',
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(userProfile?.photoURL || null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [songsData, analyticsData] = await Promise.all([
        getArtistSongs(user.uid),
        getArtistAnalytics(user.uid)
      ]);
      setSongs(songsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSongImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSongForm(prev => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile?.artistProfile) return;

    setLoading(true);
    try {
      // Find or create artist document
      const allArtists = await getAllArtists();
      let artistId = allArtists.find(a => a.name === userProfile.artistProfile?.stageName)?.id;

      if (!artistId) {
        // Create artist if doesn't exist
        const newArtistId = await addArtist({
          name: userProfile.artistProfile.stageName,
          genre: userProfile.artistProfile.genre,
          image: ''
        });
        artistId = newArtistId;
      }

      // Upload song image if provided
      let imageUrl = songForm.image;
      if (songForm.imageFile) {
        imageUrl = await uploadImage(songForm.imageFile, `songs/${user.uid}/${songForm.imageFile.name}`);
      }

      // Add song
      await addSongAsArtist(
        {
          title: songForm.title,
          artist: userProfile.artistProfile.stageName,
          artistId: artistId!,
          image: imageUrl
        },
        artistId!,
        user.uid
      );

      // Reset form
      setSongForm({ title: '', image: '', imageFile: null });
      setImagePreview(null);
      
      alert('Song added successfully!');
      fetchData();
      setActiveTab('songs');
    } catch (error: any) {
      alert(`Error adding song: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLyrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !lyricsForm.songId) return;

    setLoading(true);
    try {
      await saveTranslation({
        songId: lyricsForm.songId,
        userId: user.uid,
        originalLyrics: lyricsForm.originalLyrics,
        translatedLyrics: lyricsForm.translatedLyrics,
        culturalContext: lyricsForm.culturalContext,
        sourceLang: lyricsForm.sourceLang,
        targetLang: lyricsForm.targetLang,
        source: 'manual',
        status: 'approved' // Auto-approve for artists
      });

      // Reset form
      setLyricsForm({
        songId: '',
        originalLyrics: '',
        translatedLyrics: '',
        culturalContext: '',
        sourceLang: 'en',
        targetLang: 'en'
      });

      alert('Lyrics added successfully!');
      fetchData();
      setActiveTab('songs');
    } catch (error: any) {
      alert(`Error adding lyrics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Upload profile image if provided
      let photoURL: string | undefined;
      if (profileImageFile) {
        photoURL = await uploadImage(profileImageFile, `artists/${user.uid}/${profileImageFile.name}`);
      }

      const { updateArtistProfile } = await import('../services/firebaseService');
      await updateArtistProfile(user.uid, {
        stageName: profileForm.stageName,
        genre: profileForm.genre,
        bio: profileForm.bio,
        location: profileForm.location || undefined,
        website: profileForm.website || undefined,
        socialLinks: {
          instagram: profileForm.instagram || undefined,
          twitter: profileForm.twitter || undefined,
          facebook: profileForm.facebook || undefined,
          youtube: profileForm.youtube || undefined,
        },
        photoURL
      });

      alert('Profile updated successfully!');
      window.location.reload(); // Reload to get updated profile
    } catch (error: any) {
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this song? This action cannot be undone.')) return;

    setLoading(true);
    try {
      await deleteArtistSong(songId, user.uid);
      alert('Song deleted successfully!');
      fetchData();
    } catch (error: any) {
      alert(`Error deleting song: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user || userProfile?.role !== 'artist') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#122118]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400">You must be an artist to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Artist Dashboard</h1>
          <p className="text-gray-400">Manage your songs, lyrics, and profile</p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg p-2 flex space-x-2 mb-6 overflow-x-auto">
          {[
            { id: 'songs', label: 'My Songs' },
            { id: 'add-song', label: 'Add Song' },
            { id: 'add-lyrics', label: 'Add Lyrics' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'profile', label: 'Profile' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* My Songs Tab */}
        {activeTab === 'songs' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">My Songs</h2>
            {loading ? (
              <AdminListPageSkeleton rows={5} />
            ) : songs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>You haven't added any songs yet.</p>
                <button
                  onClick={() => setActiveTab('add-song')}
                  className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Add Your First Song
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {songs.map(song => (
                  <div key={song.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    {song.image && (
                      <img
                        src={song.image}
                        alt={song.title}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold text-white mb-1">{song.title}</h3>
                    <p className="text-sm text-gray-400 mb-3">{song.artist}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setLyricsForm(prev => ({ ...prev, songId: song.id }));
                          setActiveTab('add-lyrics');
                        }}
                        className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                      >
                        Add Lyrics
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Song Tab */}
        {activeTab === 'add-song' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Add New Song</h2>
            <form onSubmit={handleAddSong} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Song Title *</label>
                <input
                  type="text"
                  value={songForm.title}
                  onChange={(e) => setSongForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter song title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Song Image</label>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSongImageChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? <span className="inline-flex h-4 w-16 rounded-full bg-white/30 animate-pulse" /> : 'Add Song'}
              </button>
            </form>
          </div>
        )}

        {/* Add Lyrics Tab */}
        {activeTab === 'add-lyrics' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Add Lyrics</h2>
            <form onSubmit={handleAddLyrics} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Song *</label>
                <select
                  value={lyricsForm.songId}
                  onChange={(e) => setLyricsForm(prev => ({ ...prev, songId: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select a song --</option>
                  {songs.map(song => (
                    <option key={song.id} value={song.id}>{song.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Original Lyrics *</label>
                <textarea
                  value={lyricsForm.originalLyrics}
                  onChange={(e) => setLyricsForm(prev => ({ ...prev, originalLyrics: e.target.value }))}
                  required
                  rows={8}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter the original lyrics..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Translated Lyrics</label>
                <textarea
                  value={lyricsForm.translatedLyrics}
                  onChange={(e) => setLyricsForm(prev => ({ ...prev, translatedLyrics: e.target.value }))}
                  rows={8}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter translated lyrics (optional)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cultural Context</label>
                <textarea
                  value={lyricsForm.culturalContext}
                  onChange={(e) => setLyricsForm(prev => ({ ...prev, culturalContext: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Explain cultural references, meanings, etc. (optional)..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Source Language</label>
                  <select
                    value={lyricsForm.sourceLang}
                    onChange={(e) => setLyricsForm(prev => ({ ...prev, sourceLang: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {SUPPORTED_LANGUAGES.filter(l => l.isActive).map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Language</label>
                  <select
                    value={lyricsForm.targetLang}
                    onChange={(e) => setLyricsForm(prev => ({ ...prev, targetLang: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {SUPPORTED_LANGUAGES.filter(l => l.isActive).map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? <span className="inline-flex h-4 w-20 rounded-full bg-white/30 animate-pulse" /> : 'Add Lyrics'}
              </button>
            </form>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Analytics</h2>
            {loading ? (
              <div className="space-y-4 animate-pulse py-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-lg bg-gray-700" />
                  ))}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-12 rounded-lg bg-gray-700/70" />
                  ))}
                </div>
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-400 mb-1">{analytics.totalSongs}</div>
                    <div className="text-gray-400">Total Songs</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-400 mb-1">{analytics.totalTranslations}</div>
                    <div className="text-gray-400">Total Translations</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-400 mb-1">{analytics.totalViews}</div>
                    <div className="text-gray-400">Total Views</div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Song Performance</h3>
                  <div className="space-y-2">
                    {analytics.songs.map((song: any) => (
                      <div key={song.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{song.title}</div>
                          <div className="text-sm text-gray-400">
                            {song.translations} translations
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-purple-400">{song.views}</div>
                          <div className="text-xs text-gray-400">views</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No analytics data available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-white mb-4">Edit Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Picture</label>
                {profileImagePreview && (
                  <img
                    src={profileImagePreview}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover mb-2 border-2 border-gray-600"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Stage Name *</label>
                <input
                  type="text"
                  value={profileForm.stageName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, stageName: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Genre *</label>
                <select
                  value={profileForm.genre}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, genre: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Genre</option>
                  <option value="Afrobeats">Afrobeats</option>
                  <option value="Afro-pop">Afro-pop</option>
                  <option value="Amapiano">Amapiano</option>
                  <option value="Highlife">Highlife</option>
                  <option value="Afro-fusion">Afro-fusion</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio *</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={profileForm.website}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                  <input
                    type="text"
                    value={profileForm.instagram}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Twitter/X</label>
                  <input
                    type="text"
                    value={profileForm.twitter}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, twitter: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Facebook</label>
                  <input
                    type="text"
                    value={profileForm.facebook}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, facebook: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">YouTube</label>
                  <input
                    type="text"
                    value={profileForm.youtube}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, youtube: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Channel URL"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? <span className="inline-flex h-4 w-24 rounded-full bg-white/30 animate-pulse" /> : 'Update Profile'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDashboard;

