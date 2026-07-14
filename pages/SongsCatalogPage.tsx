import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { useAudioPlayer } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';
import { SongListSkeleton } from '../components/PageSkeletons';
import type { Song, Artist, Genre } from '../types';

type SortOption = 'popularity' | 'title' | 'artist' | 'year' | 'genre' | 'language' | 'views' | 'requests';
type FilterType = 'all' | 'artist' | 'genre' | 'year' | 'language';

const SongsCatalogPage: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isSpotifyPremium } = useAuth();
  const { loadTrackById, currentTrack, isPlaying, togglePlayPause, playbackMode } = useAudioPlayer();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter states
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Adjust items per page based on screen size
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth < 768 ? 20 : 50);
    };
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Fetch artists, genres, and filter metadata once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [artistsData, genresData, songsData] = await Promise.all([
          apiFetch('/api/catalog/artists?limit=200'),
          apiFetch('/api/catalog/home'),
          apiFetch('/api/catalog/songs?limit=500'),
        ]);
        setArtists(artistsData?.artists || []);
        setGenres(genresData?.genres || []);

        const allSongs: Song[] = (songsData?.songs || []).map((s: any) => ({ ...s, image: s.image || '' }));
        const years = [...new Set<number>(allSongs.filter(s => s.year).map(s => s.year!))].sort((a, b) => b - a);
        setAvailableYears(years);
        const languages = [...new Set<string>(allSongs.filter(s => s.language).map(s => s.language!))].sort();
        setAvailableLanguages(languages);
      } catch (err: any) {
        console.error('Failed to load filter data:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch songs with server-side filtering and pagination
  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          limit: itemsPerPage,
          page: currentPage,
          sortBy,
          sortOrder,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedArtist !== 'all') params.artistId = selectedArtist;
        if (selectedGenre !== 'all') params.genre = selectedGenre;
        if (selectedYear !== 'all') params.year = parseInt(selectedYear);
        if (selectedLanguage !== 'all') params.language = selectedLanguage;

        const query = Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&');

        const data = await apiFetch('/api/catalog/songs?' + query);
        const fetchedSongs = (data?.songs || []).map((s: any) => ({ ...s, image: s.image || '', spotifyId: s.spotifyId || null }));
        setSongs(fetchedSongs);
        setTotalCount(data?.total ?? fetchedSongs.length);
      } catch (err: any) {
        setError(err.message || 'Failed to load songs');
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [currentPage, itemsPerPage, searchQuery, selectedArtist, selectedGenre, selectedYear, selectedLanguage, sortBy, sortOrder]);

  // Songs are already paginated from server
  const paginatedSongs = songs;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedArtist('all');
    setSelectedGenre('all');
    setSelectedYear('all');
    setSelectedLanguage('all');
    setSortBy('popularity');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8 space-y-3">
            <div className="h-10 w-72 max-w-full rounded-full bg-gray-800/70 animate-pulse" />
            <div className="h-5 w-96 max-w-full rounded-full bg-gray-800/60 animate-pulse" />
          </div>
          <div className="mb-4 sm:mb-6">
            <div className="h-12 rounded-lg bg-gray-800/70 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 rounded-lg bg-gray-800/70 animate-pulse" />
            ))}
          </div>
          <SongListSkeleton count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
            Song <span className="text-green-400">Catalog</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Browse and discover {songs.length} songs with advanced filtering and sorting
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search songs, artists, or genres..."
              className="w-full px-4 py-3 text-base sm:text-lg bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <svg
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between min-h-[44px] px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
          >
            <span className="font-medium">Filters & Sort</span>
            <svg
              className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Filters and Sort */}
        <div className={`bg-gray-800 rounded-lg border border-gray-700 mb-4 sm:mb-6 ${showFilters ? 'block' : 'hidden'} md:block`}>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
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
                  {genres.map(genre => (
                    <option key={genre.id} value={genre.name}>{genre.name}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              {availableLanguages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Languages</option>
                    {availableLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as SortOption);
                      setCurrentPage(1);
                    }}
                    className="flex-1 px-3 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="popularity">Popularity</option>
                    <option value="title">Title</option>
                    <option value="artist">Artist</option>
                    <option value="year">Year</option>
                    <option value="genre">Genre</option>
                    <option value="language">Language</option>
                    <option value="views">Views</option>
                    <option value="requests">Requests</option>
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

            {/* Reset Filters Button */}
            {(selectedArtist !== 'all' || selectedGenre !== 'all' || selectedYear !== 'all' || selectedLanguage !== 'all' || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 py-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm sm:text-base text-gray-400">
            Showing {paginatedSongs.length} of {totalCount} songs
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Songs List */}
        {paginatedSongs.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No Songs Found</h3>
            <p className="text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 sm:space-y-3 mb-6">
              {paginatedSongs.map((song, index) => {
                const isThisPlaying = currentTrack?.id === song.spotifyId && isPlaying;

                return (
                <div
                  key={song.id}
                  className="group flex items-center gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 min-h-[48px] bg-gray-800/50 hover:bg-gray-700/50 rounded-lg sm:rounded-xl border border-gray-700 hover:border-green-400/50 transition-all duration-300 active:scale-[0.98]"
                >
                  {/* Play button / Index */}
                  <div className="flex-shrink-0 w-8 sm:w-10 md:w-12 text-center">
                    {song.spotifyId ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (isThisPlaying) {
                            togglePlayPause();
                          } else {
                            loadTrackById(song.spotifyId!, song.title, song.artist);
                          }
                        }}
                        className="text-sm sm:text-base md:text-lg font-bold text-gray-500 hover:text-green-400 transition-colors w-full h-full flex items-center justify-center"
                        aria-label={isThisPlaying ? 'Pause' : `Play ${song.title}`}
                      >
                        {isThisPlaying ? (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm sm:text-base md:text-lg font-bold text-gray-500 group-hover:text-green-400 transition-colors">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/songs/${song.id}`}
                    className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 md:gap-4"
                  >
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-green-500/20 to-amber-500/20 rounded-lg overflow-hidden">
                      {song.image ? (
                        <img src={song.image} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white group-hover:text-green-400 transition-colors line-clamp-1">
                          {song.title}
                        </h3>
                        {(song as any).source === 'SPOTIFY' && (
                          <span className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                            Preview
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-400">
                        <p className="line-clamp-1">{song.artist}</p>
                        {song.genre && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="px-1.5 sm:px-0">{song.genre}</span>
                          </>
                        )}
                        {song.year && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="px-1.5 sm:px-0">{song.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Hide stats on very small screens */}
                    <div className="hidden sm:flex flex-shrink-0 items-center gap-2 md:gap-4 text-xs sm:text-sm text-gray-400">
                      {song.views && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="hidden md:inline">{song.views.toLocaleString()}</span>
                        </div>
                      )}
                      {song.requestCount && song.requestCount > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          <span className="hidden md:inline">{song.requestCount}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded-lg text-white transition-colors text-base font-medium"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm sm:text-base text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 rounded-lg text-white transition-colors text-base font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SongsCatalogPage;

