import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  SearchIcon, 
  PlusIcon, 
  MusicNoteIcon, 
  ArtistIcon, 
  GenreIcon,
  LoadingSpinner
} from '../../components/icons/FlatIcons';
import ExternalMusicAPIService from '../../services/externalMusicAPIService';
import lyricAPIService from '../../services/lyricAPIService';
import lyricDataProcessor from '../../services/lyricDataProcessor';
import { addArtist, addSong, addGenre, saveFullSongPackage, getAllArtists } from '../../services/firebaseService';
import type { APISearchResult, FullSongData } from '../../types';

interface APIImportProps {
  onImportComplete: () => void;
}

const APIImportManager: React.FC<APIImportProps> = ({ onImportComplete }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'artists' | 'songs' | 'genres'>('artists');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importingWithLyrics, setImportingWithLyrics] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');

  // Use proxy for Genius API (token is injected server-side from .env.local)
  const apiService = new ExternalMusicAPIService();

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
        // Use lyricAPIService for songs to get lyrics support
        try {
          const lyricResults = await lyricAPIService.searchSongs(searchQuery, true);
          searchResults = lyricResults.map(result => ({
            id: result.id,
            title: result.title,
            artist: result.artist,
            image: result.image,
            source: result.source,
            metadata: result.metadata
          }));
        } catch (error) {
          console.error('Lyric API search failed, falling back to basic search:', error);
          // Fallback to basic search
          const data = await apiService.searchAfricanMusic(searchQuery);
          searchResults = apiService.formatGeniusResults(data.genius);
        }
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
    if (!user) {
      alert('Please log in to import items');
      return;
    }

    setImporting(item.id);
    setImportProgress('Starting import...');
    
    try {
      if (searchType === 'artists') {
        await addArtist({
          name: item.name || item.artist,
          genre: 'Afrobeats', // Default genre
          image: item.image || ''
        });
        setImportProgress('Artist imported successfully');
      } else if (searchType === 'songs') {
        // Check if this is from lyricAPIService (has metadata)
        if (item.metadata || item.source === 'genius' || item.source === 'lyricfind') {
          // Import with lyrics using full song package
          setImportingWithLyrics(true);
          setImportProgress('Fetching full song data with lyrics...');
          
          try {
            // Convert item to APISearchResult format
            const apiResult: APISearchResult = {
              id: item.id,
              title: item.title,
              artist: item.artist,
              image: item.image,
              source: item.source || 'genius',
              confidence: 0.85,
              metadata: item.metadata || {}
            };

            // Fetch full song data including lyrics
            const fullData = await lyricAPIService.fetchFullSongData(apiResult);
            setImportProgress('Saving song with lyrics...');

            // Check for duplicates
            const duplicateCheck = await lyricDataProcessor.checkForDuplicates(fullData);
            if (duplicateCheck.isDuplicate && duplicateCheck.existingSong) {
              const proceed = confirm(
                `Song "${item.title}" by ${item.artist} already exists. Do you want to update it?`
              );
              if (!proceed) {
                setImporting(null);
                setImportingWithLyrics(false);
                return;
              }
            }

            // Save full song package (song + artist + lyrics as translation)
            const saveResult = await saveFullSongPackage(
              fullData.song,
              fullData.artist,
              fullData.lyrics || '',
              user.uid,
              fullData.metadata.language || 'en',
              'en',
              fullData.metadata
            );

            if (saveResult.success) {
              setImportProgress('Song with lyrics imported successfully!');
            } else {
              throw new Error(saveResult.error || 'Failed to save song package');
            }
          } catch (error: any) {
            console.error('Error importing song with lyrics:', error);
            // Fallback to basic import without lyrics
            setImportProgress('Lyrics import failed, importing song metadata only...');
            await addSong({
              title: item.title,
              artist: item.artist,
              artistId: '',
              image: item.image || '',
              lyrics: '',
              language: 'English'
            });
            setImportProgress('Song imported (without lyrics)');
          } finally {
            setImportingWithLyrics(false);
          }
        } else {
          // Basic import without lyrics
          await addSong({
            title: item.title,
            artist: item.artist,
            artistId: '',
            image: item.image || '',
            lyrics: '',
            language: 'English'
          });
          setImportProgress('Song imported successfully');
        }
      } else if (searchType === 'genres') {
        await addGenre({
          name: item.name,
          image: ''
        });
        setImportProgress('Genre imported successfully');
      }
      
      // Remove imported item from results
      setResults(results.filter(r => r.id !== item.id));
      onImportComplete();
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Import failed: ${error.message || 'Unknown error'}`);
    } finally {
      setImporting(null);
      setImportProgress('');
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

      {/* API Info */}
      <div className="mb-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-400 mb-1">Genius API Configured</h4>
            <p className="text-sm text-gray-300">
              Your Genius API token is configured in <code className="text-green-300">.env.local</code>. 
              When importing songs, lyrics will be automatically fetched and saved.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              For songs: Full lyrics import is enabled. For artists and genres: Metadata only.
            </p>
          </div>
        </div>
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
                  <div className="ml-2 flex flex-col items-end gap-1">
                    <button
                      onClick={() => handleImport(item)}
                      disabled={importing === item.id}
                      className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                      title={searchType === 'songs' ? 'Import song with lyrics' : 'Import'}
                    >
                      {importing === item.id ? (
                        <LoadingSpinner />
                      ) : (
                        <PlusIcon className="w-4 h-4 text-white" />
                      )}
                    </button>
                    {importing === item.id && importProgress && (
                      <span className="text-xs text-gray-400 max-w-[100px] truncate" title={importProgress}>
                        {importProgress}
                      </span>
                    )}
                  </div>
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






