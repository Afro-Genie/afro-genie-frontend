import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiClient';
import { SquareGridSkeleton } from '../components/PageSkeletons';
import type { Artist } from '../types';

type SortOption = 'popularity' | 'followers' | 'name' | 'createdAt';

const ArtistsPage: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const itemsPerPage = 24;

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number | undefined> = {
          limit: itemsPerPage,
          sortBy,
          sortOrder,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (currentPage > 1 && nextCursor) params.cursor = nextCursor;

        const query = Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&');

        const data = await apiFetch(`/api/artists?${query}`);
        const fetchedArtists = (data?.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          genre: a.genres?.[0] || '',
          image: a.imageUrl || '',
          spotifyId: a.spotifyId,
          bio: a.bio,
          popularity: a.popularity || 0,
          followers: a.followers || 0,
          genres: a.genres || [],
        }));

        if (currentPage === 1) {
          setArtists(fetchedArtists);
        } else {
          setArtists((prev) => [...prev, ...fetchedArtists]);
        }
        setTotalCount(data?.total ?? fetchedArtists.length);
        setNextCursor(data?.nextCursor ?? null);
      } catch (err: any) {
        setError(err.message || 'Failed to load artists');
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [sortBy, sortOrder, searchQuery, currentPage]);

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sortBy) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSort);
      setSortOrder('desc');
    }
    setCurrentPage(1);
    setNextCursor(null);
  };

  const loadMore = () => {
    if (!loading && nextCursor) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
            Browse <span className="text-green-400">Artists</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Discover {totalCount} artists sorted by popularity
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                setNextCursor(null);
              }}
              placeholder="Search artists..."
              className="w-full px-4 py-3 text-base bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'popularity' as SortOption, label: 'Popularity' },
            { key: 'followers' as SortOption, label: 'Followers' },
            { key: 'name' as SortOption, label: 'Name' },
            { key: 'createdAt' as SortOption, label: 'Newest' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleSortChange(opt.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                sortBy === opt.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700 hover:border-green-400/50'
              }`}
            >
              {opt.label}
              {sortBy === opt.key && (
                <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && currentPage === 1 ? (
          <SquareGridSkeleton count={12} />
        ) : artists.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-700">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No artists found</h3>
            <p className="text-gray-400">Try adjusting your search or sort criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {artists.map((artist) => (
                <Link
                  to={`/artist/${artist.id}`}
                  key={artist.id}
                  className="group text-center"
                >
                  <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors text-sm">
                    {artist.name}
                  </h3>
                  {artist.genre && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{artist.genre}</p>
                  )}
                  {artist.popularity > 0 && (
                    <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden mx-2">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${artist.popularity}%` }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {/* Load More */}
            {nextCursor && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold rounded-xl border border-gray-700 hover:border-green-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                      Loading...
                    </span>
                  ) : (
                    'Load More Artists'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistsPage;
