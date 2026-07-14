import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useClickOutside from '../hooks/useClickOutside';
import SearchIcon from './icons/SearchIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import MicIcon from './icons/MicIcon';
import TagIcon from './icons/TagIcon';
import { SearchResultsSkeleton } from './PageSkeletons';
import { searchSuggest } from '../lib/apiClient';
import { trackEvent } from '../services/telemetryService';
import type { Suggestion, Artist, Song, Genre } from '../types';

interface SearchBarProps {
  variant?: 'header' | 'homepage';
}

const SearchBar: React.FC<SearchBarProps> = ({ variant = 'header' }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useClickOutside(searchContainerRef, () => setSuggestions([]));

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const suggestResult = await searchSuggest(query);
        const items = Array.isArray(suggestResult)
          ? suggestResult
          : Array.isArray(suggestResult?.suggestions)
          ? suggestResult.suggestions
          : [];

        const apiSuggestions: Suggestion[] = items
          .map((item: any) => {
            const type = String(item.type || '').toLowerCase();
            const doc = item.document || item;

            if (type === 'song') {
              return {
                type: 'song' as const,
                data: {
                  id: doc.id || doc.songId || '',
                  title: doc.title || doc.name || 'Untitled',
                  artist: doc.artistName || doc.artist || 'Unknown',
                  artistId: doc.artistId || '',
                  image: doc.imageUrl || doc.image || doc.coverImageUrl || '',
                } as Song,
              };
            }

            if (type === 'artist') {
              return {
                type: 'artist' as const,
                data: {
                  id: doc.id || '',
                  name: doc.name || doc.artist || 'Unknown Artist',
                  genre: doc.genre || (Array.isArray(doc.genres) ? doc.genres[0] : '') || '',
                  image: doc.imageUrl || doc.image || '',
                } as Artist,
              };
            }

            if (type === 'genre') {
              return {
                type: 'genre' as const,
                data: {
                  id: doc.id || doc.name || 'genre',
                  name: doc.name || doc.genre || 'Unknown Genre',
                  image: doc.imageUrl || '',
                } as Genre,
              };
            }

            return null;
          })
          .filter(Boolean) as Suggestion[];

        setSuggestions(apiSuggestions.slice(0, 8));
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setError('Search unavailable. Please try again.');
        setTimeout(() => setError(null), 4000);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      trackEvent('search_suggestion_click', { query, type: suggestions[selectedIndex].type, position: selectedIndex, source: 'keyboard' });
      navigate(getSuggestionLink(suggestions[selectedIndex]));
      setSuggestions([]);
      setSelectedIndex(-1);
      setQuery('');
      return;
    }
    if (query.trim()) {
      trackEvent('search_submitted', { query: query.trim(), source: 'bar' });
      navigate(`/search/${encodeURIComponent(query.trim())}`);
      setSuggestions([]);
    }
  };
  
  const handleSuggestionClick = (item: Suggestion, index: number) => {
      trackEvent('search_suggestion_click', { query, type: item.type, position: index });
      setSuggestions([]);
      setSelectedIndex(-1);
      setQuery('');
  }

  const getSuggestionLink = (item: Suggestion): string => {
    if (item.type === 'song') {
      const song = item.data as Song;
      return `/songs/${song.id}`;
    }
    return `/search/${encodeURIComponent(item.data.name)}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  const baseClasses = "relative";
  const variants = {
    header: {
      container: "w-full sm:w-56",
      input: "bg-[#2a3c30] text-white placeholder-gray-400 rounded-md py-2.5 sm:py-2 min-h-[44px] pl-10 pr-4 w-full text-base focus:outline-none focus:ring-2 focus:ring-green-400",
      icon: "h-5 w-5 text-gray-400",
      iconContainer: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    },
    homepage: {
      container: "w-full max-w-3xl mx-auto",
      input: "w-full min-h-[44px] sm:min-h-0 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-base sm:text-lg rounded-full py-4 pl-16 pr-6 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20",
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
            data-testid="search-bar"
            type="text"
            placeholder={variant === 'header' ? 'Search artists, songs, genres...' : 'Search for artist, song, or genre'}
            className={currentVariant.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (query.length > 1) setSuggestions(suggestions)}}
          />
        </div>
      </form>
      {error && suggestions.length === 0 && !loading && (
        <div className="absolute top-full mt-2 w-full bg-red-900/80 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-200 z-50">
          {error}
        </div>
      )}
      {(suggestions.length > 0 || loading) && (
        <div className="absolute top-full mt-2 w-full bg-[#2a3c30] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
          {loading ? (
            <div className="p-2">
              <SearchResultsSkeleton count={3} />
            </div>
          ) : suggestions.length > 0 ? (
            <ul ref={listRef}>
              {suggestions.map((item, index) => {
                const linkTo = getSuggestionLink(item);
                const isActive = index === selectedIndex;

                return (
                  <li key={index}>
                    <Link 
                      to={linkTo} 
                      onClick={() => handleSuggestionClick(item, index)} 
                      data-testid="search-suggestion"
                      ref={(el) => {
                        if (isActive && el) {
                          el.scrollIntoView({ block: 'nearest' });
                        }
                      }}
                      className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 min-h-[60px] sm:min-h-[auto] transition-colors border-b border-gray-700/50 last:border-b-0 ${isActive ? 'bg-green-500/15' : 'hover:bg-green-500/10 active:bg-green-500/20'}`}
                    >
                      {item.type === 'artist' && <MicIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.type === 'song' && <MusicNoteIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.type === 'genre' && <TagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-white truncate">
                          {item.type === 'song' 
                            ? item.data.title 
                            : item.data.name}
                        </p>
                        {item.type === 'song' && (
                          <p className="text-sm text-gray-400 truncate">{item.data.artist}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded flex-shrink-0 text-gray-500 bg-gray-700">
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