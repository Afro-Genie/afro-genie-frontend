import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres } from '../services/firebaseService';
import useClickOutside from '../hooks/useClickOutside';
import SearchIcon from './icons/SearchIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import MicIcon from './icons/MicIcon';
import TagIcon from './icons/TagIcon';
import LoadingSpinner from './LoadingSpinner';
import type { Suggestion, Artist, Song, Genre } from '../types';

interface SearchBarProps {
  variant?: 'header' | 'homepage';
}

const SearchBar: React.FC<SearchBarProps> = ({ variant = 'header' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<{ artists: Artist[]; songs: Song[]; genres: Genre[] }>({
    artists: [],
    songs: [],
    genres: []
  });
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useClickOutside(searchContainerRef, () => setSuggestions([]));

  // Fetch all data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [artists, songs, genres] = await Promise.all([
          getAllArtists(),
          getAllSongs(),
          getAllGenres()
        ]);
        setAllData({ artists, songs, genres });
      } catch (error) {
        console.error('Error fetching search data:', error);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const lowerCaseQuery = query.toLowerCase();
    
    const filteredArtists = allData.artists
      .filter(a => a.name.toLowerCase().includes(lowerCaseQuery))
      .map(data => ({ type: 'artist' as const, data }));

    const filteredSongs = allData.songs
      .filter(s => s.title.toLowerCase().includes(lowerCaseQuery))
      .map(data => ({ type: 'song' as const, data }));

    const filteredGenres = allData.genres
      .filter(g => g.name.toLowerCase().includes(lowerCaseQuery))
      .map(data => ({ type: 'genre' as const, data }));

    setSuggestions([...filteredArtists, ...filteredSongs, ...filteredGenres].slice(0, 8));
    setLoading(false);
  }, [query, allData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search/${encodeURIComponent(query.trim())}`);
      setSuggestions([]);
      setQuery('');
    }
  };
  
  const handleSuggestionClick = () => {
      setSuggestions([]);
      setQuery('');
  }

  const baseClasses = "relative";
  const variants = {
    header: {
      container: "w-56",
      input: "bg-[#2a3c30] text-white placeholder-gray-400 rounded-md py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-green-400",
      icon: "h-5 w-5 text-gray-400",
      iconContainer: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    },
    homepage: {
      container: "w-full max-w-3xl mx-auto",
      input: "w-full bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-lg rounded-full py-4 pl-16 pr-6 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20",
      icon: "h-6 w-6 text-gray-300",
      iconContainer: "absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"
    }
  };
  
  const currentVariant = variants[variant];

  return (
    <div className={`${baseClasses} ${currentVariant.container}`} ref={searchContainerRef}>
      <form onSubmit={handleSearchSubmit}>
        <div className="relative">
          <div className={currentVariant.iconContainer}>
            <SearchIcon className={currentVariant.icon} />
          </div>
          <input
            type="text"
            placeholder={variant === 'header' ? 'Search' : 'Search for artist, language, or genre'}
            className={currentVariant.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.length > 1) setSuggestions(suggestions)}}
          />
        </div>
      </form>
      {(suggestions.length > 0 || loading) && (
        <div className="absolute top-full mt-2 w-full bg-[#2a3c30] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <LoadingSpinner />
              <span className="ml-2 text-gray-400">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((item, index) => {
                const linkTo = item.type === 'song' 
                  ? `/song/${item.data.id}` 
                  : `/search/${encodeURIComponent(item.data.name)}`;

                return (
                  <li key={index}>
                    <Link to={linkTo} onClick={handleSuggestionClick} className="flex items-center gap-4 px-4 py-3 hover:bg-green-500/10 transition-colors">
                      {item.type === 'artist' && <MicIcon className="h-5 w-5 text-gray-400" />}
                      {item.type === 'song' && <MusicNoteIcon className="h-5 w-5 text-gray-400" />}
                      {item.type === 'genre' && <TagIcon className="h-5 w-5 text-gray-400" />}
                      <div className="flex-grow">
                        <p className="font-semibold text-white">
                          {item.type === 'song' ? item.data.title : item.data.name}
                        </p>
                        {item.type === 'song' && <p className="text-sm text-gray-400">{item.data.artist}</p>}
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-700 px-2 py-1 rounded">
                        {item.type}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-3 text-gray-400 text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;