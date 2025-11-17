import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres } from '../services/firebaseService';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Artist, Song, Genre } from '../types';

const SearchResultsPage: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const navigate = useNavigate();
  const decodedQuery = query ? decodeURIComponent(query) : '';
  const [searchInput, setSearchInput] = useState(decodedQuery);
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(decodedQuery);
  }, [decodedQuery]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [fetchedArtists, fetchedSongs, fetchedGenres] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres()
        ]);
        setArtists(fetchedArtists);
        setSongs(fetchedSongs);
        setGenres(fetchedGenres);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const lowerCaseQuery = decodedQuery.toLowerCase();

  const matchingArtists = lowerCaseQuery ? artists.filter(artist => 
    artist.name.toLowerCase().includes(lowerCaseQuery)
  ) : [];
  
  const matchingSongs = lowerCaseQuery ? songs.filter(song => 
    song.title.toLowerCase().includes(lowerCaseQuery) || 
    song.artist.toLowerCase().includes(lowerCaseQuery)
  ) : [];

  const matchingGenres = lowerCaseQuery ? genres.filter(genre => 
    genre.name.toLowerCase().includes(lowerCaseQuery)
  ) : [];

  const hasResults = matchingArtists.length > 0 || matchingSongs.length > 0 || matchingGenres.length > 0;
  const totalResults = matchingArtists.length + matchingSongs.length + matchingGenres.length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search/${encodeURIComponent(searchInput.trim())}`);
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
                  className="w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-lg rounded-full py-4 pl-16 pr-6 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
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
                    className="w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-xl rounded-full py-5 pl-16 pr-24 focus:outline-none focus:ring-2 focus:ring-green-400 border-2 border-white/20 hover:border-green-400/50 transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <div className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3 transition-colors font-semibold">
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
                    to={`/search/${encodeURIComponent(artist.name)}`}
                    className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-white rounded-full text-sm transition-colors border border-gray-700 hover:border-green-400/50"
                  >
                    {artist.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : !hasResults ? (
        <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-3xl font-bold text-white mb-4">No Results Found</h2>
            <p className="text-gray-400 text-lg mb-12">Try a different search term or check your spelling.</p>
            
            {/* Search Bar for New Search */}
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
                    className="w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-xl rounded-full py-5 pl-16 pr-24 focus:outline-none focus:ring-2 focus:ring-green-400 border-2 border-white/20 hover:border-green-400/50 transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <div className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-3 transition-colors font-semibold">
                      Search
                    </div>
                  </button>
                </div>
              </form>
            </div>

            <Link
              to="/request-translation"
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-full transition-all duration-300"
            >
              Request a Song
            </Link>
          </div>
        ) : (
        <div className="space-y-12">
            {/* Search Bar for Refining Search */}
            <div className="max-w-3xl mx-auto">
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
                    className="w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-lg rounded-full py-4 pl-16 pr-24 focus:outline-none focus:ring-2 focus:ring-green-400 border-2 border-white/20 hover:border-green-400/50 transition-colors"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <div className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-2.5 transition-colors font-semibold text-sm">
                      Search
                    </div>
                  </button>
                </div>
              </form>
            </div>

            {/* Songs Section */}
          {matchingSongs.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Songs <span className="text-green-400">({matchingSongs.length})</span>
                  </h2>
                  {matchingSongs.length > 9 && (
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
                  {matchingSongs.slice(0, 10).map((song) => (
                    <Link
                      to={`/song/${song.id}`}
                      key={song.id}
                      className="group bg-gray-800/50 hover:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-700 hover:border-green-400/50 transition-all duration-300"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-amber-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                      {song.image ? (
                            <img
                              src={song.image}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white group-hover:text-green-400 transition-colors line-clamp-2 mb-1">
                            {song.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-1">
                            {song.artist}
                          </p>
                        </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

            {/* Artists Section */}
          {matchingArtists.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Artists <span className="text-green-400">({matchingArtists.length})</span>
                  </h2>
                  {matchingArtists.length > 12 && (
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
                  {matchingArtists.slice(0, 12).map((artist) => (
                    <Link
                      to={`/search/${encodeURIComponent(artist.name)}`}
                      key={artist.id}
                      className="group text-center"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                      {artist.image ? (
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                        </div>
                      )}
                    </div>
                      <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                        {artist.name}
                      </h3>
                      {artist.genre && (
                        <p className="text-sm text-gray-400 mt-1">{artist.genre}</p>
                      )}
                  </Link>
                ))}
              </div>
            </section>
          )}

            {/* Genres Section */}
          {matchingGenres.length > 0 && (
            <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-white">
                    Genres <span className="text-green-400">({matchingGenres.length})</span>
                  </h2>
                  {matchingGenres.length > 10 && (
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
                {matchingGenres.map((genre) => (
                    <Link
                      to={`/search/${encodeURIComponent(genre.name)}`}
                      key={genre.id}
                      className="group text-center"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-gradient-to-br from-green-500/20 to-amber-500/20 border border-gray-700 group-hover:border-green-400/50 mb-3">
                      {genre.image ? (
                          <img
                            src={genre.image}
                            alt={genre.name}
                            className="w-full h-full object-cover"
                          />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                        </div>
                      )}
                    </div>
                      <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                        {genre.name}
                      </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
