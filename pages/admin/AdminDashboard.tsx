import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres, getAllUsers } from '../../services/firebaseService';
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

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    artists: 0,
    songs: 0,
    genres: 0,
    users: 0,
    translations: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAPIManagement, setShowAPIManagement] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [artists, songs, genres, users] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres(),
          getAllUsers()
        ]);

        setStats({
          artists: artists.length,
          songs: songs.length,
          genres: genres.length,
          users: users.length,
          translations: 0 // You can add this if you have a translations count
        });
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
        const [artists, songs, genres, users] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres(),
          getAllUsers()
        ]);

        setStats({
          artists: artists.length,
          songs: songs.length,
          genres: genres.length,
          users: users.length,
          translations: 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>

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
