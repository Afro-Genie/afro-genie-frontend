import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createSongRequest } from '../services/firebaseService';
import { useAuth } from '../context/AuthContext';
import { SearchResultsSkeleton } from '../components/PageSkeletons';
import { featureFlags } from '../config/featureFlags';
import { trackEvent } from '../services/telemetryService';
import { searchCatalog } from '../lib/apiClient';
import type { Artist } from '../types';

interface DisplayResult {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  linkTo: string;
}

const SONGS_PER_PAGE = 10;

const SearchResultsPage: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const { user } = useAuth();
  const decodedQuery = query ? decodeURIComponent(query) : '';

  const [songResults, setSongResults] = useState<DisplayResult[]>([]);
  const [artistResults, setArtistResults] = useState<DisplayResult[]>([]);
  const [genreResults, setGenreResults] = useState<DisplayResult[]>([]);
  const [songFound, setSongFound] = useState(0);
  const [artistFound, setArtistFound] = useState(0);
  const [genreFound, setGenreFound] = useState(0);
  const [songPage, setSongPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [requestFeedbackOpen, setRequestFeedbackOpen] = useState(false);

  const mapHitsToResults = useCallback((hits: any[], type: 'song' | 'artist' | 'genre'): DisplayResult[] => {
    return hits.map((hit: any) => {
      const doc = hit.document;

      if (type === 'song') {
        return {
          id: doc.id,
          title: doc.title || 'Untitled',
          subtitle: doc.artistName || '',
          image: doc.imageUrl || '',
          linkTo: `/songs/${doc.id}`,
        };
      }
      if (type === 'artist') {
        return {
          id: doc.id,
          title: doc.name || 'Artist',
          subtitle: Array.isArray(doc.genres) ? doc.genres[0] : doc.genres || '',
          image: doc.imageUrl || '',
          linkTo: `/artist/${doc.id}`,
        };
      }
      return {
        id: doc.id,
        title: doc.name || 'Genre',
        image: doc.imageUrl || '',
        linkTo: `/search/${encodeURIComponent(doc.name)}`,
      };
    });
  }, []);

  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      setError(null);
      setSongResults([]);
      setArtistResults([]);
      setGenreResults([]);
      setSongFound(0);
      setArtistFound(0);
      setGenreFound(0);
      setSongPage(1);
      try {
        if (!decodedQuery.trim()) {
          return;
        }
        const response: any = await searchCatalog(decodedQuery, 'all', undefined, {
          page: 1,
          limit: SONGS_PER_PAGE,
        });

        setSongResults(mapHitsToResults(response.songs?.hits ?? [], 'song'));
        setArtistResults(mapHitsToResults(response.artists?.hits ?? [], 'artist'));
        setGenreResults(mapHitsToResults(response.genres?.hits ?? [], 'genre'));
        setSongFound(response.songs?.found ?? 0);
        setArtistFound(response.artists?.found ?? 0);
        setGenreFound(response.genres?.found ?? 0);

        trackEvent('search_request_submitted', {
          query: decodedQuery,
          total: (response.songs?.found ?? 0) + (response.artists?.found ?? 0) + (response.genres?.found ?? 0),
        });
      } catch (err: any) {
        setError(err.message || 'Failed to search');
        trackEvent('spotify_search_error', { query: decodedQuery });
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [decodedQuery, mapHitsToResults]);

  const loadMoreSongs = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = songPage + 1;
      const response: any = await searchCatalog(decodedQuery, 'song', undefined, {
        page: nextPage,
        limit: SONGS_PER_PAGE,
      });
      const moreSongs = mapHitsToResults(response.songs?.hits ?? [], 'song');
      setSongResults((prev) => [...prev, ...moreSongs]);
      setSongPage(nextPage);
    } catch {
      // silently fail on load more
    } finally {
      setLoadingMore(false);
    }
  }, [decodedQuery, songPage, loadingMore, mapHitsToResults]);

  const hasResults = (songFound + artistFound + genreFound) > 0;
  const hasMoreSongs = songResults.length < songFound;

  useEffect(() => {
    if (decodedQuery && !loading && !hasResults) {
      trackEvent('search_no_result_view', { query: decodedQuery });
    }
  }, [decodedQuery, hasResults, loading]);

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
      <div className="min-h-screen bg-[#122118]">
        <section className="bg-gradient-to-br from-[#122118] via-[#1a2b22] to-[#122118] py-12 border-b border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 animate-pulse">
                <div className="h-14 rounded-full bg-gray-800/70 border border-white/10" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-8 w-32 rounded-full bg-gray-800/70 animate-pulse" />
                <div className="h-8 w-24 rounded-full bg-gray-800/70 animate-pulse" />
              </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <SearchResultsSkeleton count={6} />
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

  const totalResults = songFound + artistFound + genreFound;

  return (
    <div className="min-h-screen bg-[#122118]">
      {/* Results Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {decodedQuery && (
          <div className="text-center mb-8">
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
              
              <div className="relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-gray-600/50 rounded-2xl shadow-2xl p-6 md:p-8 mb-8 mx-4">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient-shift"></div>
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                      <div className="relative bg-gray-700/50 p-3 rounded-full border border-gray-600">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-gray-300 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
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
                  <button
                    onClick={() => handleRequestSong()}
                    disabled={requestLoading}
                    className="w-full md:w-auto min-h-[44px] group relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 disabled:from-gray-800 disabled:to-gray-800 text-white font-semibold py-3 px-6 md:px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    {requestLoading ? (
                      <>
                        <span className="h-5 w-5 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
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
            {/* Songs Section */}
          {songResults.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Songs <span className="text-green-400">({songFound})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {songResults.map((r, idx) => {
                    const content = (
                      <>
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
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-1">
                                {r.title}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-400 line-clamp-1">{r.subtitle}</p>
                          </div>
                        </div>
                      </>
                    );
                    const cardClass = "group bg-gray-800/50 hover:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-700 hover:border-green-400/50 transition-all duration-300 flex items-center min-h-[48px]";
                    const trackClick = () => trackEvent('search_suggestion_click', { query: decodedQuery, type: 'song', position: idx, source: 'results_page' });

                    return (
                      <Link to={r.linkTo} key={r.id} className={cardClass} onClick={trackClick}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
                {hasMoreSongs && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMoreSongs}
                      disabled={loadingMore}
                      className="min-h-[44px] px-8 py-3 bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold rounded-xl border border-gray-700 hover:border-green-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-pulse" />
                          Loading...
                        </span>
                      ) : (
                        `Load More Songs (${songResults.length} of ${songFound})`
                      )}
                    </button>
                  </div>
                )}
            </section>
          )}

            {/* Artists Section */}
          {artistResults.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Artists <span className="text-green-400">({artistFound})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                  {artistResults.map((r, idx) => {
                    const content = (
                      <>
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
                      </>
                    );
                    const cardClass = "group text-center";
                    const trackClick = () => trackEvent('search_suggestion_click', { query: decodedQuery, type: 'artist', position: idx, source: 'results_page' });

                    return (
                      <Link to={r.linkTo} key={r.id} className={cardClass} onClick={trackClick}>
                        {content}
                      </Link>
                    );
                  })}
                </div>
            </section>
          )}

            {/* Genres Section */}
          {genreResults.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Genres <span className="text-green-400">({genreFound})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                  {genreResults.map((r, idx) => (
                    <Link
                      to={r.linkTo}
                      key={r.id}
                      onClick={() => trackEvent('search_suggestion_click', { query: decodedQuery, type: 'genre', position: idx, source: 'results_page' })}
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
