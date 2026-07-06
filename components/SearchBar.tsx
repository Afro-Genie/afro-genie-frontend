import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllArtists, getAllSongs, getAllGenres, searchLyrics } from '../services/firebaseService';
import useClickOutside from '../hooks/useClickOutside';
import SearchIcon from './icons/SearchIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import MicIcon from './icons/MicIcon';
import TagIcon from './icons/TagIcon';
import TranslateIcon from './icons/TranslateIcon';
import { SearchResultsSkeleton } from './PageSkeletons';
import { spotifyService } from '../services/spotifyService';
import { trackEvent } from '../services/telemetryService';
import { searchSuggest } from '../lib/apiClient';
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

    const performSearch = async () => {
      setLoading(true);
      const lowerCaseQuery = query.toLowerCase();

      // Primary fast path: backend suggest endpoint
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

            if (type === 'song') {
              return {
                type: 'song' as const,
                data: {
                  id: item.id || item.songId || '',
                  title: item.title || item.name || 'Untitled',
                  artist: item.artist || item.artistName || 'Unknown',
                  artistId: item.artistId || '',
                  image: item.image || item.coverImageUrl || item.imageUrl || '',
                } as Song,
              };
            }

            if (type === 'artist') {
              return {
                type: 'artist' as const,
                data: {
                  id: item.id || '',
                  name: item.name || item.artist || 'Unknown Artist',
                  genre: item.genre || '',
                  image: item.image || item.imageUrl || '',
                } as Artist,
              };
            }

            if (type === 'genre') {
              return {
                type: 'genre' as const,
                data: {
                  id: item.id || item.name || 'genre',
                  name: item.name || item.genre || 'Unknown Genre',
                  image: '',
                } as Genre,
              };
            }

            return null;
          })
          .filter(Boolean) as Suggestion[];

        if (apiSuggestions.length > 0) {
          setSuggestions(apiSuggestions.slice(0, 10));
          setLoading(false);
          return;
        }
      } catch {
        // Fall back to existing local+Spotify search below.
      }
      
      // Search artists, songs, and genres (synchronous - already loaded)
      const filteredArtists = allData.artists
        .filter(a => a.name.toLowerCase().includes(lowerCaseQuery))
        .map(data => ({ type: 'artist' as const, data }));

      const filteredSongs = allData.songs
        .filter(s => s.title.toLowerCase().includes(lowerCaseQuery) || s.artist.toLowerCase().includes(lowerCaseQuery))
        .map(data => ({ type: 'song' as const, data }));

      const filteredGenres = allData.genres
        .filter(g => g.name.toLowerCase().includes(lowerCaseQuery))
        .map(data => ({ type: 'genre' as const, data }));

      // Search lyrics (async - from database)
      let lyricsSuggestions: Suggestion[] = [];
      let spotifyArtistSuggestions: Suggestion[] = [];
      let spotifyTrackSuggestions: Suggestion[] = [];
      try {
        if (query.length >= 3) { // Only search lyrics for longer queries to avoid too many results
          const matchingLyrics = await searchLyrics(query, 5);
          lyricsSuggestions = matchingLyrics.map(lyric => ({
            type: 'lyrics' as const,
            data: {
              id: lyric.id || '',
              songId: lyric.songId,
              songTitle: lyric.songTitle,
              artistName: lyric.artistName,
              preview: lyric.originalLyrics?.substring(0, 100) || lyric.translatedLyrics?.substring(0, 100) || ''
            }
          }));
        }

        // Backend-proxied Spotify fallbacks (for missing local data)
        const [spotifyArtists, spotifyTracks] = await Promise.all([
          spotifyService.searchArtist(query, 3).catch(() => []),
          spotifyService.searchTracks(query, 3).catch(() => [])
        ]);

        spotifyArtistSuggestions = spotifyArtists
          .filter((a) => !filteredArtists.some((existing) => existing.data.name.toLowerCase() === a.name.toLowerCase()))
          .map((a) => ({
            type: 'artist' as const,
            data: {
              id: `spotify-artist-${a.id}`,
              name: a.name,
              genre: a.genres?.[0] || '',
              image: a.images?.[0]?.url || '',
            } as Artist
          }));

        spotifyTrackSuggestions = spotifyTracks
          .filter((t) => !filteredSongs.some((existing) => existing.data.title.toLowerCase() === t.name.toLowerCase()))
          .map((t) => ({
            type: 'song' as const,
            data: {
              id: `spotify-track-${t.id}`,
              title: t.name,
              artist: t.artists?.[0]?.name || 'Unknown',
              artistId: '',
              image: t.album?.images?.[0]?.url || '',
            } as Song
          }));
        trackEvent('spotify_search_success', { query });
      } catch (error) {
        console.error('Error searching lyrics:', error);
        trackEvent('spotify_search_error', { query });
      }

      // Combine and prioritize: artists first, then songs, then genres, then lyrics
      const allSuggestions = [
        ...filteredArtists.slice(0, 3),
        ...filteredSongs.slice(0, 3),
        ...filteredGenres.slice(0, 2),
        ...lyricsSuggestions.slice(0, 3),
        ...spotifyArtistSuggestions.slice(0, 2),
        ...spotifyTrackSuggestions.slice(0, 2),
      ].slice(0, 10);

      setSuggestions(allSuggestions);
      setLoading(false);
    };

    // Debounce the search slightly for lyrics
    const timeoutId = setTimeout(performSearch, query.length >= 3 ? 300 : 0);
    return () => clearTimeout(timeoutId);
  }, [query, allData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search/${encodeURIComponent(query.trim())}`);
      setSuggestions([]);
      // Don't clear query here - let the search page handle it
    }
  };
  
  const handleSuggestionClick = () => {
      setSuggestions([]);
      setQuery('');
  }

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
            placeholder={variant === 'header' ? 'Search artists, songs, lyrics...' : 'Search for artist, song, lyrics, or genre'}
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
            <div className="p-2">
              <SearchResultsSkeleton count={3} />
            </div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((item, index) => {
                let linkTo = '';
                if (item.type === 'song') {
                  linkTo = item.data.id.startsWith('spotify-track-')
                    ? `/search/${encodeURIComponent(`${item.data.title} ${item.data.artist}`)}`
                    : `/songs/${item.data.id}`;
                } else if (item.type === 'lyrics') {
                  linkTo = `/songs/${item.data.songId}`;
                } else {
                  linkTo = `/search/${encodeURIComponent(item.data.name)}`;
                }

                return (
                  <li key={index}>
                    <Link 
                      to={linkTo} 
                      onClick={handleSuggestionClick} 
                      data-testid="search-suggestion"
                      className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 min-h-[60px] sm:min-h-[auto] hover:bg-green-500/10 active:bg-green-500/20 transition-colors border-b border-gray-700/50 last:border-b-0"
                    >
                      {item.type === 'artist' && <MicIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.type === 'song' && <MusicNoteIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.type === 'genre' && <TagIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.type === 'lyrics' && <TranslateIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />}
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-white truncate">
                          {item.type === 'song' 
                            ? item.data.title 
                            : item.type === 'lyrics'
                            ? `${item.data.songTitle || 'Song'} - Lyrics`
                            : item.data.name}
                        </p>
                        {item.type === 'song' && (
                          <p className="text-sm text-gray-400 truncate">{item.data.artist}</p>
                        )}
                        {item.type === 'lyrics' && (
                          <>
                            {item.data.artistName && (
                              <p className="text-sm text-gray-400 truncate">{item.data.artistName}</p>
                            )}
                            {item.data.preview && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">
                                "{item.data.preview}..."
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-700 px-2 py-1 rounded flex-shrink-0">
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