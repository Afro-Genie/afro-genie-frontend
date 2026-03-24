import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAllArtists, createSongRequest } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import { featureFlags } from '../config/featureFlags';
import { trackEvent } from '../services/telemetryService';
import { unifiedSearchService, type UnifiedSearchResult, type UnifiedSearchResponse } from '../services/unifiedSearchService';
import type { Artist } from '../types';

function ResultCard({
  result,
  type,
  onRequestSong,
  requestLoading,
}: {
  result: UnifiedSearchResult;
  type: 'song' | 'artist';
  onRequestSong?: (songTitle: string, artist: string) => void;
  requestLoading?: boolean;
}) {
  const isArtist = type === 'artist';
  const imageEl = (
    <div className={`flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 ${isArtist ? 'aspect-square w-full' : 'w-16 h-16'} flex items-center justify-center`}>
      {result.image ? (
        <img src={result.image} alt={result.title} className="w-full h-full object-cover" />
      ) : (
        <svg className={isArtist ? 'w-16 h-16 text-gray-500' : 'w-8 h-8 text-green-400'} fill="currentColor" viewBox="0 0 20 20">
          {isArtist ? (
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          ) : (
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          )}
        </svg>
      )}
    </div>
  );
  const textEl = (
    <div className={`flex-1 min-w-0 ${isArtist ? 'text-center mt-3' : 'py-4 pr-4'}`}>
      <h3 className="font-bold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-1">
        {result.title}
      </h3>
      {result.subtitle && (
        <p className="text-sm text-gray-400 line-clamp-1">{result.subtitle}</p>
      )}
      {!isArtist && onRequestSong && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestSong(result.title, result.subtitle || 'Unknown');
          }}
          disabled={requestLoading}
          className="mt-2 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
        >
          {requestLoading ? 'Requesting...' : 'Request to add'}
        </button>
      )}
    </div>
  );

  const cardClass = `group rounded-xl overflow-hidden border border-gray-700 hover:border-green-400/50 transition-all duration-300 bg-gray-800/50 hover:bg-gray-700/50 min-h-[48px] ${isArtist ? 'flex flex-col' : 'flex items-center gap-4 pl-4'}`;

  if (result.externalUrl) {
    return (
      <a href={result.externalUrl} target="_blank" rel="noopener noreferrer" className={cardClass}>
        {imageEl}
        {textEl}
      </a>
    );
  }

  return (
    <div className={cardClass}>
      {imageEl}
      {textEl}
    </div>
  );
}

const SearchResultsPage: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decodedQuery = query ? decodeURIComponent(query) : '';
  const [searchInput, setSearchInput] = useState(decodedQuery);

  const [searchResponse, setSearchResponse] = useState<UnifiedSearchResponse | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [requestFeedbackOpen, setRequestFeedbackOpen] = useState(false);

  useEffect(() => {
    setSearchInput(decodedQuery);
  }, [decodedQuery]);

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      setError(null);
      setSearchResponse(null);
      try {
        if (!decodedQuery.trim()) {
          const [fetchedArtists] = await Promise.all([getAllArtists()]);
          setArtists(fetchedArtists);
          setSearchResponse({
            query: '',
            localResults: [],
            spotifyResults: [],
            allResults: [],
            usedSpotifyFallback: false,
          });
          return;
        }
        const response = await unifiedSearchService.search(decodedQuery, {
          localLimit: 30,
          spotifyArtistLimit: 5,
          spotifyTrackLimit: 10,
          maxResults: 40,
          minLocalResultsWithoutFallback: 1,
        });
        setSearchResponse(response);
        if (response.usedSpotifyFallback && response.spotifyResults.length > 0) {
          trackEvent('spotify_search_success', { query: decodedQuery, count: response.spotifyResults.length });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to search');
        trackEvent('spotify_search_error', { query: decodedQuery });
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [decodedQuery]);

  const localSongs = searchResponse?.localResults.filter((r) => r.entityType === 'song') ?? [];
  const localArtists = searchResponse?.localResults.filter((r) => r.entityType === 'artist') ?? [];
  const localGenres = searchResponse?.localResults.filter((r) => r.entityType === 'genre') ?? [];
  const spotifySongs = searchResponse?.spotifyResults.filter((r) => r.entityType === 'song') ?? [];
  const spotifyArtists = searchResponse?.spotifyResults.filter((r) => r.entityType === 'artist') ?? [];

  const hasResults =
    (searchResponse?.localResults.length ?? 0) > 0 || (searchResponse?.spotifyResults.length ?? 0) > 0;
  const totalResults =
    (searchResponse?.localResults.length ?? 0) + (searchResponse?.spotifyResults.length ?? 0);

  useEffect(() => {
    if (decodedQuery && !loading && !hasResults) {
      trackEvent('search_no_result_view', { query: decodedQuery });
    }
  }, [decodedQuery, hasResults, loading]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleRequestSong = async (songTitleOverride?: string, artistOverride?: string) => {
    const songTitle = songTitleOverride ?? decodedQuery.split(/[-–—]/).map((s) => s.trim())[0] ?? decodedQuery;
    const artist = artistOverride ?? decodedQuery.split(/[-–—]/).map((s) => s.trim())[1] ?? decodedQuery;

    if (!songTitle.trim() && !artist.trim()) {
      setNotification({ message: 'Please enter a song or artist name', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setRequestLoading(true);
    try {
      await createSongRequest({
        songTitle,
        artist,
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous@example.com',
        searchQuery: decodedQuery || `${songTitle} ${artist}`.trim()
      });
      trackEvent('search_request_submitted', {
        query: decodedQuery,
        hasUser: Boolean(user?.uid)
      });
      
      if (featureFlags.requestFeedbackModal) {
        setRequestFeedbackOpen(true);
      } else {
        setNotification({ 
          message: 'Song request submitted! Admins will be notified and add it soon.', 
          type: 'success' 
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err: any) {
      setNotification({ 
        message: 'Failed to submit request: ' + err.message, 
        type: 'error' 
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118] py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#122118] py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-white">Error loading results</h2>
          <p className="text-gray-400 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118]">
      {/* Search Header Section */}
      <section className="bg-gradient-to-br from-[#122118] via-[#1a2b22] to-[#122118] py-12 border-b border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search for Songs, Artists & Albums"
                  className="w-full min-h-[44px] bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-base sm:text-lg rounded-full py-4 pl-16 pr-14 sm:pr-24 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-2 flex items-center min-h-[44px] min-w-[44px]"
                >
                  <div className="bg-green-500 hover:bg-green-600 text-white rounded-full p-2 transition-colors">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </button>
              </div>
            </form>

            {decodedQuery && (
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {hasResults ? (
                    <>
                      {totalResults} {totalResults === 1 ? 'Result' : 'Results'} for{' '}
                      <span className="text-green-400">"{decodedQuery}"</span>
                    </>
                  ) : (
                    <>
                      No results for <span className="text-green-400">"{decodedQuery}"</span>
                    </>
                  )}
      </h1>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!decodedQuery ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Search for <span className="text-green-400">Songs, Artists & Albums</span>
            </h2>
            <p className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
              Discover African music across languages, genres, and artists
            </p>
            
            {/* Prominent Search Bar in Center */}
            <div className="max-w-3xl mx-auto mb-8">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                        </div>
                  <input
                    type="text"
                    placeholder="Search for Songs, Artists & Albums"
                    className="w-full min-h-[44px] bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-base sm:text-xl rounded-full py-4 sm:py-5 pl-16 pr-24 focus:outline-none focus:ring-2 focus:ring-green-400 border-2 border-white/20 hover:border-green-400/50 transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-2 flex items-center min-h-[44px] min-w-[44px] sm:min-w-0"
                  >
                    <div className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3 min-h-[44px] flex items-center transition-colors font-semibold">
                      Search
                    </div>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Search Suggestions */}
            <div className="max-w-4xl mx-auto mt-12">
              <p className="text-gray-400 mb-4 text-sm">Popular Searches:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                {artists.slice(0, 6).map((artist) => (
                  <Link
                    key={artist.id}
                    to={`/artist/${artist.id}`}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-full text-sm transition-colors border border-gray-700 hover:border-green-400/50"
                  >
                    {artist.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : !hasResults ? (
        <div className="text-center py-12 md:py-20 animate-fade-in-up" data-testid="search-no-results">
            <div className="max-w-2xl mx-auto">
              {/* Icon with animation */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gray-500/20 rounded-full animate-ping"></div>
                <div className="relative bg-gray-800/50 p-4 rounded-full border border-gray-600">
                  <svg className="h-16 w-16 md:h-20 md:w-20 text-gray-400 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">No Results Found</h2>
              <p className="text-gray-400 text-base md:text-lg mb-8 px-4">
                We couldn't find "{decodedQuery}" in our database. Would you like to request this song to be added?
              </p>
              
              {/* Request Song Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-600/50 rounded-2xl shadow-2xl p-6 md:p-8 mb-8 mx-4">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    {/* Icon */}
                    <div className="flex-shrink-0 relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                      <div className="relative bg-gray-700/50 p-3 rounded-full border border-gray-600">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-300 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                        Request Song to be Added
                      </h3>
                      <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                        Can't find the song you're looking for? Request it and our team will add it to the database!
                      </p>
                      <div className="mt-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                        <p className="text-xs text-gray-400 mb-1">Requesting:</p>
                        <p className="text-white font-semibold text-sm md:text-base break-words">"{decodedQuery}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={handleRequestSong}
                    disabled={requestLoading}
                    className="w-full md:w-auto min-h-[44px] group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 px-6 md:px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    
                    {requestLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="relative z-10">Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="relative z-10">Request Song</span>
                        <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-gray-500 text-sm px-4">
                Use the search bar above to try another query.
              </p>
            </div>
          </div>
        ) : (
        <div className="space-y-12">
            {/* Local Songs Section */}
          {localSongs.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Songs <span className="text-green-400">({localSongs.length})</span>
                  </h2>
                  {localSongs.length > 9 && (
                    <Link
                      to={`/search/${encodeURIComponent(decodedQuery + ' songs')}`}
                      className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                    >
                      More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {localSongs.slice(0, 10).map((r) => (
                    <Link
                      to={`/song/${r.localId!}`}
                      key={r.id}
                      className="group bg-gray-800/50 hover:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-700 hover:border-green-400/50 transition-all duration-300 flex items-center min-h-[48px]"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-amber-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                          {r.image ? (
                            <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-1">
                            {r.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-1">{r.subtitle}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
            </section>
          )}

            {/* Local Artists Section */}
          {localArtists.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Artists <span className="text-green-400">({localArtists.length})</span>
                  </h2>
                  {localArtists.length > 12 && (
                    <Link
                      to={`/search/${encodeURIComponent(decodedQuery + ' artists')}`}
                      className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                    >
                      More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                  {localArtists.slice(0, 12).map((r) => (
                    <Link
                      to={`/artist/${r.localId!}`}
                      key={r.id}
                      className="group text-center"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                        {r.image ? (
                          <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                        {r.title}
                      </h3>
                      {r.subtitle && (
                        <p className="text-sm text-gray-400 mt-1">{r.subtitle}</p>
                      )}
                    </Link>
                  ))}
                </div>
            </section>
          )}

            {/* Local Genres Section */}
          {localGenres.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Genres <span className="text-green-400">({localGenres.length})</span>
                  </h2>
                  {localGenres.length > 10 && (
                    <Link
                      to={`/search/${encodeURIComponent(decodedQuery + ' genres')}`}
                      className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-2"
                    >
                      More <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                  {localGenres.map((r) => (
                    <Link
                      to={`/search/${encodeURIComponent(r.title)}`}
                      key={r.id}
                      className="group text-center"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                        {r.image ? (
                          <img src={r.image} alt={r.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                        {r.title}
                      </h3>
                    </Link>
                  ))}
                </div>
            </section>
          )}

            {/* Spotify Fallback: Songs */}
          {spotifySongs.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Songs from Spotify <span className="text-green-400">({spotifySongs.length})</span>
                  </h2>
                  <span className="text-xs font-medium text-gray-500 bg-gray-700 px-2 py-1 rounded">
                    From Spotify
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {spotifySongs.map((r) => (
                    <ResultCard
                      key={r.id}
                      result={r}
                      type="song"
                      onRequestSong={(title, artist) => handleRequestSong(title, artist)}
                      requestLoading={requestLoading}
                    />
                  ))}
                </div>
            </section>
          )}

            {/* Spotify Fallback: Artists */}
          {spotifyArtists.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Artists from Spotify <span className="text-green-400">({spotifyArtists.length})</span>
                  </h2>
                  <span className="text-xs font-medium text-gray-500 bg-gray-700 px-2 py-1 rounded">
                    From Spotify
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                  {spotifyArtists.map((r) => (
                    <ResultCard key={r.id} result={r} type="artist" />
                  ))}
                </div>
            </section>
          )}
        </div>
      )}
      </div>

      {requestFeedbackOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 px-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-3">Request Received</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Your request has been received. Typical turnaround is <span className="text-green-400 font-semibold">5-10 minutes</span>.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Thank you for contributing to AfroGenie. Your request helps expand our library and you are recognized as a contributor.
            </p>
            <button
              type="button"
              onClick={() => setRequestFeedbackOpen(false)}
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;
