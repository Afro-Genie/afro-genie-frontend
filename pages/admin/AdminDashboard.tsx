import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres, getAllUsers, getTopics, getCategories, getPendingTranslationRequestCount, getTranslationRequests, getPendingSongRequestCount, getSongRequests } from '../../services/firebaseService';
import { 
  MusicNoteIcon, 
  ArtistIcon, 
  GenreIcon, 
  UsersIcon, 
  TrendingUpIcon,
  StatsIcon,
  GridIcon,
  PlusIcon
} from '../../components/icons/FlatIcons';
import APIManagement from '../../components/admin/APIManagement';
import { AdminDashboardSkeleton } from '../../components/PageSkeletons';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    artists: 0,
    songs: 0,
    genres: 0,
    users: 0,
    translations: 0,
    topics: 0,
    categories: 0,
    pendingTranslationRequests: 0,
    pendingSongRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAPIManagement, setShowAPIManagement] = useState(false);
  const [recentTranslationRequests, setRecentTranslationRequests] = useState<any[]>([]);
  const [recentSongRequests, setRecentSongRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [artists, songs, genres, users, topics, categories, pendingTranslationCount, translationRequests, pendingSongCount, songRequests] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres(),
          getAllUsers(),
          getTopics(undefined, 'latest', 1000).catch(() => []),
          getCategories().catch(() => []),
          getPendingTranslationRequestCount().catch(() => 0),
          getTranslationRequests('pending').catch(() => []),
          getPendingSongRequestCount().catch(() => 0),
          getSongRequests('pending').catch(() => [])
        ]);

        setStats({
          artists: artists.length,
          songs: songs.length,
          genres: genres.length,
          users: users.length,
          translations: 0, // You can add this if you have a translations count
          topics: topics.length,
          categories: categories.length,
          pendingTranslationRequests: pendingTranslationCount,
          pendingSongRequests: pendingSongCount
        });
        setRecentTranslationRequests(translationRequests.slice(0, 5));
        setRecentSongRequests(songRequests.slice(0, 5));
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleImportComplete = () => {
    // Refresh stats after import
    const fetchStats = async () => {
      try {
        const [artists, songs, genres, users, topics, categories] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres(),
          getAllUsers(),
          getTopics(undefined, 'latest', 1000).catch(() => []),
          getCategories().catch(() => [])
        ]);

        const [pendingTranslationCount, translationRequests, pendingSongCount, songRequests] = await Promise.all([
          getPendingTranslationRequestCount().catch(() => 0),
          getTranslationRequests('pending').catch(() => []),
          getPendingSongRequestCount().catch(() => 0),
          getSongRequests('pending').catch(() => [])
        ]);
        
        setStats({
          artists: artists.length,
          songs: songs.length,
          genres: genres.length,
          users: users.length,
          translations: 0,
          topics: topics.length,
          categories: categories.length,
          pendingTranslationRequests: pendingTranslationCount,
          pendingSongRequests: pendingSongCount
        });
        setRecentTranslationRequests(translationRequests.slice(0, 5));
        setRecentSongRequests(songRequests.slice(0, 5));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-6 py-8">
        <AdminDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GridIcon className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">AfroGenie Admin</h1>
            </div>
            <div className="text-white/80">
              <span className="text-sm">Control Panel</span>
            </div>
          </div>
          <div className="text-white">
            <span className="text-sm">Today: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Welcome Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Admin!</h2>
              <p className="text-gray-300">Manage your AfroGenie platform with ease</p>
            </div>
            <div className="flex items-center space-x-2">
              <StatsIcon className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-semibold">Live Dashboard</span>
            </div>
          </div>
        </div>

        {/* Stats Cards - Inspired by the dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Artists Card */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Artists</p>
                <p className="text-3xl font-bold">{stats.artists}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">+12%</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <ArtistIcon className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Songs Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Songs</p>
                <p className="text-3xl font-bold">{stats.songs}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">+8%</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <MusicNoteIcon className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Genres Card */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Genres</p>
                <p className="text-3xl font-bold">{stats.genres}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">+5%</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <GenreIcon className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold">{stats.users}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">+15%</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <UsersIcon className="w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Topics Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Total Topics</p>
                <p className="text-3xl font-bold">{stats.topics}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">Active</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Categories Card */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Categories</p>
                <p className="text-3xl font-bold">{stats.categories}</p>
                <div className="flex items-center mt-2">
                  <TrendingUpIcon className="w-4 h-4 text-green-300" />
                  <span className="text-green-300 text-sm ml-1">Forum</span>
                </div>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <GenreIcon className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Translation Requests Section */}
        {stats.pendingTranslationRequests > 0 && (
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Translation Requests</h3>
                  <p className="text-orange-100">{stats.pendingTranslationRequests} pending request{stats.pendingTranslationRequests !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Link
                to="/admin/translation-requests"
                className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                View All
              </Link>
            </div>
            {recentTranslationRequests.length > 0 && (
              <div className="space-y-2 mt-4">
                {recentTranslationRequests.map((request) => (
                  <div key={request.id} className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{request.songTitle}</p>
                      <p className="text-sm text-orange-100">by {request.artist}</p>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {request.userEmail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Song Requests Section */}
        {stats.pendingSongRequests > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Song Requests</h3>
                  <p className="text-blue-100">{stats.pendingSongRequests} pending request{stats.pendingSongRequests !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <Link
                to="/admin/song-requests"
                className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg transition-colors font-semibold"
              >
                View All
              </Link>
            </div>
            {recentSongRequests.length > 0 && (
              <div className="space-y-2 mt-4">
                {recentSongRequests.map((request) => (
                  <div key={request.id} className="bg-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{request.songTitle}</p>
                      <p className="text-sm text-blue-100">by {request.artist}</p>
                      {request.searchQuery && (
                        <p className="text-xs text-blue-200 mt-1">Searched: "{request.searchQuery}"</p>
                      )}
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      {request.userEmail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions - Enhanced Design */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <div className="flex items-center space-x-2">
              <PlusIcon className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Add New Content</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/admin/artists"
              className="group bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <ArtistIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Manage Artists</p>
                  <p className="text-gray-300 text-sm">Add, edit, or remove artists</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/songs"
              className="group bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <MusicNoteIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Manage Songs</p>
                  <p className="text-gray-300 text-sm">Add, edit, or remove songs</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/genres"
              className="group bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl p-6 hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <GenreIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Manage Genres</p>
                  <p className="text-gray-300 text-sm">Add, edit, or remove genres</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/community"
              className="group bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl p-6 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-full p-3 group-hover:bg-white/30 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Manage Community</p>
                  <p className="text-gray-300 text-sm">Manage topics, categories, and comments</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* API Management Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Industry-Standard API Management</h2>
            <div className="flex items-center space-x-2">
              <PlusIcon className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Multi-Source Integration</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Advanced API Integration</h3>
                <p className="text-blue-100 mb-4">Pull from Genius, MusicBrainz, Last.fm, TheAudioDB with rate limiting, caching & admin controls</p>
                <button
                  onClick={() => setShowAPIManagement(!showAPIManagement)}
                  className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>{showAPIManagement ? 'Hide' : 'Show'} API Management</span>
                </button>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <MusicNoteIcon className="w-12 h-12" />
              </div>
            </div>
          </div>

          {showAPIManagement && (
            <APIManagement onDataImported={handleImportComplete} />
          )}
        </div>

        {/* Unified Management Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Unified Content Management</h2>
            <div className="flex items-center space-x-2">
              <GridIcon className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">All-in-One</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Master Control Panel</h3>
                <p className="text-green-100 mb-4">Manage all content types in one powerful interface</p>
                <Link
                  to="/admin/unified"
                  className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <GridIcon className="w-5 h-5" />
                  <span>Open Unified Manager</span>
                </Link>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <GridIcon className="w-12 h-12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
