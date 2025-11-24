import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllSongs, deleteSong, getAllArtists } from '../../services/firebaseService';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Song, Artist } from '../../types';

const SongsManager: React.FC = () => {
  const navigate = useNavigate();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'year' | 'views' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedSongs, fetchedArtists] = await Promise.all([
        getAllSongs(),
        getAllArtists()
      ]);
      setSongs(fetchedSongs);
      setArtists(fetchedArtists);
    } catch (error: any) {
      showNotification({
        message: `Error loading songs: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique genres from songs
  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    songs.forEach(song => {
      if (song.genre) {
        genres.add(song.genre);
      }
    });
    return Array.from(genres).sort();
  }, [songs]);

  // Filter and sort songs
  const filteredAndSortedSongs = useMemo(() => {
    let filtered = [...songs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        (song.genre && song.genre.toLowerCase().includes(query))
      );
    }

    // Artist filter
    if (selectedArtist !== 'all') {
      filtered = filtered.filter(song => song.artistId === selectedArtist);
    }

    // Genre filter
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(song => song.genre === selectedGenre);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'artist':
          aValue = a.artist.toLowerCase();
          bValue = b.artist.toLowerCase();
          break;
        case 'year':
          aValue = a.year || 0;
          bValue = b.year || 0;
          break;
        case 'views':
          aValue = a.views || 0;
          bValue = b.views || 0;
          break;
        case 'createdAt':
          aValue = a.createdAt?.toDate?.() || new Date(0);
          bValue = b.createdAt?.toDate?.() || new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [songs, searchQuery, selectedArtist, selectedGenre, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSongs.length / itemsPerPage);
  const paginatedSongs = filteredAndSortedSongs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (songId: string, songTitle: string) => {
    const hasConfirmed = await confirm({
      title: 'Delete Song',
      message: `Are you sure you want to delete "${songTitle}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!hasConfirmed) return;

      try {
        await deleteSong(songId);
      showNotification({
        message: 'Song deleted successfully!',
        type: 'success'
      });
      fetchData();
    } catch (error: any) {
      showNotification({
        message: `Error deleting song: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleEdit = (songId: string) => {
    navigate(`/admin/songs/edit/${songId}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedArtist('all');
    setSelectedGenre('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Songs Management</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage and organize all songs in your database</p>
        </div>
        <Link
          to="/admin/songs/add"
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Song
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Songs</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{songs.length}</p>
              </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Filtered Results</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{filteredAndSortedSongs.length}</p>
              </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Artists</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{artists.length}</p>
            </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Genres</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{availableGenres.length}</p>
              </div>
            </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by title, artist, or genre..."
                className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            </div>

          {/* Artist Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Artist</label>
            <select
              value={selectedArtist}
              onChange={(e) => {
                setSelectedArtist(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Artists</option>
              {artists.map(artist => (
                <option key={artist.id} value={artist.id}>{artist.name}</option>
              ))}
            </select>
          </div>

          {/* Genre Filter */}
            <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Genres</option>
              {availableGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="createdAt">Date Added</option>
                <option value="title">Title</option>
                <option value="artist">Artist</option>
                <option value="year">Year</option>
                <option value="views">Views</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 min-w-[44px] bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        {(searchQuery || selectedArtist !== 'all' || selectedGenre !== 'all') && (
          <button
            onClick={resetFilters}
            className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset Filters
          </button>
        )}
        </div>

      {/* Songs List - Mobile Card View / Desktop Table View */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {paginatedSongs.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <div className="text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-lg font-semibold text-white mb-2">No Songs Found</p>
              <p>Try adjusting your filters or search query</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Song
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Artist
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Genre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedSongs.map((song) => (
                    <tr key={song.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-700">
                            {song.image ? (
                              <img src={song.image} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{song.title}</div>
                            {song.language && (
                              <div className="text-xs text-gray-400">{song.language}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{song.artist}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-green-600/20 text-green-300 rounded-full">
                          {song.genre || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{song.year || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {song.views ? song.views.toLocaleString() : '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(song.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(song.id, song.title)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                            Delete
                          </button>
                          <Link
                            to={`/song/${song.id}`}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-700">
              {paginatedSongs.map((song) => (
                <div key={song.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-700">
                  {song.image ? (
                        <img src={song.image} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{song.title}</h3>
                      <p className="text-sm text-gray-300 mb-2">{song.artist}</p>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {song.genre && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-600/20 text-green-300 rounded-full">
                            {song.genre}
                          </span>
                        )}
                        {song.year && (
                          <span className="text-xs text-gray-400">{song.year}</span>
                        )}
                        {song.views && (
                          <span className="text-xs text-gray-400">
                            {song.views.toLocaleString()} views
                          </span>
                  )}
                </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                  <button
                      onClick={() => handleEdit(song.id)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                      onClick={() => handleDelete(song.id, song.title)}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded transition-colors"
                  >
                    Delete
                  </button>
                    <Link
                      to={`/song/${song.id}`}
                      className="flex-1 min-h-[44px] px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded transition-colors text-center"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedSongs.length)} of {filteredAndSortedSongs.length} songs
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-white transition-colors text-base font-medium"
              >
                Previous
              </button>
              <span className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-white transition-colors text-base font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
};

export default SongsManager;
