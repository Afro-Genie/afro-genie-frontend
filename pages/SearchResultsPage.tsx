import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres } from '../services/firebaseService';
import SearchIcon from '../components/icons/SearchIcon';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Artist, Song, Genre } from '../types';

const SearchResultsPage: React.FC = () => {
  const { query } = useParams<{ query: string }>();
  const decodedQuery = query ? decodeURIComponent(query) : '';
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold text-white">Error loading results</h2>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        Results for "<span className="text-green-400">{decodedQuery}</span>"
      </h1>

      {!hasResults ? (
        <div className="text-center py-20">
          <SearchIcon className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <h2 className="text-2xl font-semibold text-white">No results found</h2>
          <p className="text-gray-400 mt-2">Try a different search term or check your spelling.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {matchingSongs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Songs</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {matchingSongs.map((song) => (
                  <Link to={`/song/${song.id}`} key={song.id} className="group">
                    <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg">
                      {song.image ? (
                        <img src={song.image} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold text-white truncate">{song.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {matchingArtists.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {matchingArtists.map((artist) => (
                  <Link to={`/search/${artist.name}`} key={artist.id} className="group">
                    <div className="aspect-square rounded-full overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-[#2a3c30]">
                      {artist.image ? (
                        <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <span className="text-2xl">🎤</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 font-semibold text-white text-center">{artist.name}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {matchingGenres.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Genres</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {matchingGenres.map((genre) => (
                  <Link to={`/search/${genre.name}`} key={genre.id} className="group">
                    <div className="aspect-square rounded-lg overflow-hidden transition-all duration-300 group-hover:scale-105 shadow-lg bg-[#2a3c30]">
                      {genre.image ? (
                        <img src={genre.image} alt={genre.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <span className="text-2xl">🎼</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 font-semibold text-white text-center">{genre.name}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;