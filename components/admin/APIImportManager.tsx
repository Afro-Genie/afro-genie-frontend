import React, { useState } from 'react';
import { 
  SearchIcon, 
  PlusIcon, 
  MusicNoteIcon, 
  ArtistIcon, 
  GenreIcon,
  LoadingSpinner
} from '../../components/icons/FlatIcons';
import ExternalMusicAPIService from '../../services/externalMusicAPIService';
import { addArtist, addSong, addGenre } from '../../services/firebaseService';

interface APIImportProps {
  onImportComplete: () => void;
}

const APIImportManager: React.FC<APIImportProps> = ({ onImportComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'artists' | 'songs' | 'genres'>('artists');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [geniusToken, setGeniusToken] = useState('');

  const apiService = new ExternalMusicAPIService(geniusToken);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      let searchResults: any[] = [];
      
      if (searchType === 'artists') {
        const data = await apiService.searchNigerianArtists(searchQuery);
        const geniusArtists = apiService.formatGeniusResults(data.genius);
        const mbArtists = apiService.formatMusicBrainzArtists(data.musicbrainz.artists);
        searchResults = [...geniusArtists, ...mbArtists];
      } else if (searchType === 'songs') {
        const data = await apiService.searchAfricanMusic(searchQuery);
        searchResults = apiService.formatGeniusResults(data.genius);
      } else if (searchType === 'genres') {
        // For genres, we'll use predefined African genres
        const africanGenres = apiService.getAfricanGenres();
        searchResults = africanGenres
          .filter(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(genre => ({
            id: `genre_${genre}`,
            name: genre,
            description: `Popular African music genre`,
            source: 'predefined'
          }));
      }
      
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (item: any) => {
    setImporting(item.id);
    try {
      if (searchType === 'artists') {
        await addArtist({
          name: item.name || item.artist,
          genre: 'Afrobeats', // Default genre
          image: item.image || ''
        });
      } else if (searchType === 'songs') {
        await addSong({
          title: item.title,
          artist: item.artist,
          artistId: '', // Will need to be linked to actual artist
          image: item.image || '',
          lyrics: '', // Genius doesn't provide lyrics in search results
          language: 'English' // Default
        });
      } else if (searchType === 'genres') {
        await addGenre({
          name: item.name,
          image: '' // No default image for genres
        });
      }
      
      // Remove imported item from results
      setResults(results.filter(r => r.id !== item.id));
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(null);
    }
  };

  const handleQuickImport = async () => {
    setLoading(true);
    try {
      const popularArtists = apiService.getPopularNigerianArtists();
      const africanGenres = apiService.getAfricanGenres();
      
      // Import popular Nigerian artists
      for (const artistName of popularArtists.slice(0, 5)) { // Limit to 5 for demo
        try {
          await addArtist({
            name: artistName,
            genre: 'Afrobeats',
            image: ''
          });
        } catch (error) {
          console.error(`Error importing ${artistName}:`, error);
        }
      }
      
      // Import African genres
      for (const genreName of africanGenres.slice(0, 10)) { // Limit to 10 for demo
        try {
          await addGenre({
            name: genreName,
            image: ''
          });
        } catch (error) {
          console.error(`Error importing ${genreName}:`, error);
        }
      }
      
      onImportComplete();
    } catch (error) {
      console.error('Quick import error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Import from External APIs</h2>
        <div className="flex items-center space-x-2">
          <MusicNoteIcon className="w-6 h-6 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Free APIs</span>
        </div>
      </div>

      {/* API Token Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Genius API Token (Optional - for lyrics)
        </label>
        <div className="flex space-x-4">
          <input
            type="text"
            value={geniusToken}
            onChange={(e) => setGeniusToken(e.target.value)}
            placeholder="Get free token from: https://genius.com/api-clients"
            className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <a
            href="https://genius.com/api-clients"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Get Token
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Without token: MusicBrainz metadata only. With token: + Genius lyrics & images
        </p>
      </div>

      {/* Search Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Type</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="artists">Artists</option>
            <option value="songs">Songs</option>
            <option value="genres">Genres</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Search Query</label>
          <div className="relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${searchType}...`}
              className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? <LoadingSpinner /> : 'Search'}
          </button>
        </div>
      </div>

      {/* Quick Import */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white mb-1">Quick Import</h3>
            <p className="text-sm text-gray-300">Import popular Nigerian artists and African genres</p>
          </div>
          <button
            onClick={handleQuickImport}
            disabled={loading}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Quick Import</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Search Results ({results.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <div key={item.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {item.name || item.title || item.artist}
                    </h4>
                    {item.artist && (
                      <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                    )}
                    <div className="flex items-center mt-2">
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {item.source}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImport(item)}
                    disabled={importing === item.id}
                    className="ml-2 p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {importing === item.id ? (
                      <LoadingSpinner />
                    ) : (
                      <PlusIcon className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Information */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-semibold text-white mb-2">Available APIs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-green-400 mb-1">Genius API</h5>
            <p className="text-gray-300">Lyrics, artist info, song metadata</p>
            <p className="text-xs text-gray-400">Rate: 60 req/min (free)</p>
          </div>
          <div>
            <h5 className="font-medium text-blue-400 mb-1">MusicBrainz API</h5>
            <p className="text-gray-300">Artist metadata, genres, releases</p>
            <p className="text-xs text-gray-400">Rate: 1 req/sec (free)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIImportManager;






