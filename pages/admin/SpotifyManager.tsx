import React, { useState } from 'react';
import { spotifyService, SpotifyArtist, SpotifyTrack, SpotifyAlbum } from '../../services/spotifyService';
import { addArtist, addSong, updateArtist, updateSong } from '../../services/firebaseService';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Artist, Song } from '../../types';

const SpotifyManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'artist' | 'track'>('artist');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<SpotifyAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<SpotifyTrack[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setArtists([]);
    setTracks([]);
    setSelectedArtist(null);
    setArtistAlbums([]);
    setSelectedAlbum(null);
    setAlbumTracks([]);

    try {
      if (searchType === 'artist') {
        const results = await spotifyService.searchArtist(searchQuery);
        setArtists(results);
      } else {
        const results = await spotifyService.searchTracks(searchQuery);
        setTracks(results);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search Spotify. Make sure your API credentials are configured.');
    } finally {
      setLoading(false);
    }
  };

  const handleArtistSelect = async (artist: SpotifyArtist) => {
    setSelectedArtist(artist);
    setSelectedAlbum(null);
    setAlbumTracks([]);
    setLoading(true);
    try {
      const albums = await spotifyService.getArtistAlbums(artist.id);
      setArtistAlbums(albums);
    } catch (err: any) {
      setError(err.message || 'Failed to load artist albums');
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumSelect = async (album: SpotifyAlbum) => {
    setSelectedAlbum(album);
    setLoading(true);
    try {
      const tracks = await spotifyService.getAlbumTracks(album.id);
      setAlbumTracks(tracks);
    } catch (err: any) {
      setError(err.message || 'Failed to load album tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleImportArtist = async (spotifyArtist: SpotifyArtist) => {
    setImporting(spotifyArtist.id);
    try {
      const artistData: Omit<Artist, 'id'> = {
        name: spotifyArtist.name,
        genre: spotifyArtist.genres?.[0] || 'Unknown',
        image: spotifyArtist.images?.[0]?.url || ''
      };

      await addArtist(artistData);
      setImported(prev => new Set([...prev, spotifyArtist.id]));
      setNotification({ message: `Artist "${spotifyArtist.name}" imported successfully!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ message: `Failed to import artist: ${err.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setImporting(null);
    }
  };

  const handleImportTrack = async (track: SpotifyTrack) => {
    setImporting(track.id);
    try {
      // First, ensure the artist exists
      const artistName = track.artists[0]?.name || 'Unknown Artist';
      let artistId: string;

      // Try to find existing artist or create new one
      try {
        // This is a simplified approach - in production you'd want to search for existing artists
        const artistData: Omit<Artist, 'id'> = {
          name: artistName,
          genre: 'Unknown',
          image: track.artists[0]?.images?.[0]?.url || ''
        };
        artistId = await addArtist(artistData);
      } catch (err) {
        // Artist might already exist, you'd handle this better in production
        throw new Error('Failed to create artist. Please import the artist first.');
      }

      const songData: Omit<Song, 'id'> = {
        title: track.name,
        artist: artistName,
        artistId: artistId,
        image: track.album?.images?.[0]?.url || ''
      };

      await addSong(songData);
      setImported(prev => new Set([...prev, track.id]));
      setNotification({ message: `Song "${track.name}" by ${artistName} imported successfully!`, type: 'success' });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ message: `Failed to import track: ${err.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setImporting(null);
    }
  };

  const handleBatchImportTracks = async () => {
    if (!selectedAlbum || albumTracks.length === 0) {
      setNotification({ message: 'Please select an album with tracks first', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    if (!confirm(`Import all ${albumTracks.length} tracks from "${selectedAlbum.name}"?`)) {
      return;
    }

    setImporting('batch');
    let successCount = 0;
    let failCount = 0;

    for (const track of albumTracks) {
      try {
        await handleImportTrack(track);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setImporting(null);
    setNotification({ 
      message: `Batch import complete: ${successCount} succeeded, ${failCount} failed`, 
      type: successCount > 0 ? 'success' : 'error' 
    });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Spotify Integration</h1>
          <p className="text-gray-300">
            Search and import artists, albums, and tracks from Spotify. Metadata will be automatically synced.
          </p>
          {!import.meta.env.VITE_SPOTIFY_CLIENT_ID && (
            <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> Spotify API credentials not configured. Please set VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET in your .env.local file.
                <br />
                <a 
                  href="https://developer.spotify.com/documentation/web-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline text-yellow-300"
                >
                  Learn how to get Spotify API credentials
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
          <div className="flex gap-4 mb-4">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'artist' | 'track')}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600"
            >
              <option value="artist">Search Artists</option>
              <option value="track">Search Tracks</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'artist' ? 'Enter artist name...' : 'Enter track name...'}
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? <LoadingSpinner /> : 'Search'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {loading && artists.length === 0 && tracks.length === 0 && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Artist Results */}
        {artists.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Artists</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                    selectedArtist?.id === artist.id
                      ? 'border-green-500'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    {artist.images?.[0] && (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{artist.name}</h3>
                      {artist.genres && artist.genres.length > 0 && (
                        <p className="text-sm text-gray-400">{artist.genres[0]}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleArtistSelect(artist)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors"
                    >
                      View Albums
                    </button>
                    <button
                      onClick={() => handleImportArtist(artist)}
                      disabled={importing === artist.id || imported.has(artist.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm py-2 px-3 rounded transition-colors"
                    >
                      {importing === artist.id ? 'Importing...' : imported.has(artist.id) ? 'Imported' : 'Import'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Track Results */}
        {tracks.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Tracks</h2>
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-700"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {track.album?.images?.[0] && (
                      <img
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-white">{track.name}</h3>
                      <p className="text-sm text-gray-400">
                        {track.artists.map(a => a.name).join(', ')}
                        {track.album && ` • ${track.album.name}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImportTrack(track)}
                    disabled={importing === track.id || imported.has(track.id)}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm py-2 px-4 rounded transition-colors"
                  >
                    {importing === track.id ? 'Importing...' : imported.has(track.id) ? 'Imported' : 'Import'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Artist Albums */}
        {selectedArtist && artistAlbums.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Albums by {selectedArtist.name}
              </h2>
              <button
                onClick={() => {
                  setSelectedArtist(null);
                  setArtistAlbums([]);
                  setSelectedAlbum(null);
                  setAlbumTracks([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {artistAlbums.map((album) => (
                <div
                  key={album.id}
                  className={`bg-gray-800 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                    selectedAlbum?.id === album.id
                      ? 'border-green-500'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => handleAlbumSelect(album)}
                >
                  {album.images?.[0] && (
                    <img
                      src={album.images[0].url}
                      alt={album.name}
                      className="w-full aspect-square object-cover rounded mb-2"
                    />
                  )}
                  <h3 className="font-bold text-white text-sm mb-1">{album.name}</h3>
                  {album.release_date && (
                    <p className="text-xs text-gray-400">{album.release_date.split('-')[0]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Album Tracks */}
        {selectedAlbum && albumTracks.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">
                Tracks from {selectedAlbum.name}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleBatchImportTracks}
                  disabled={importing === 'batch'}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  {importing === 'batch' ? 'Importing...' : `Import All (${albumTracks.length})`}
                </button>
                <button
                  onClick={() => {
                    setSelectedAlbum(null);
                    setAlbumTracks([]);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {albumTracks.map((track, index) => (
                <div
                  key={track.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-700"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-gray-400 w-8">{index + 1}</span>
                    <div>
                      <h3 className="font-bold text-white">{track.name}</h3>
                      <p className="text-sm text-gray-400">
                        {track.artists.map(a => a.name).join(', ')}
                        {track.duration_ms && ` • ${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImportTrack(track)}
                    disabled={importing === track.id || imported.has(track.id)}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white text-sm py-2 px-4 rounded transition-colors"
                  >
                    {importing === track.id ? 'Importing...' : imported.has(track.id) ? 'Imported' : 'Import'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 z-50 max-w-md mx-auto md:mx-0 animate-slide-in-right">
          <div className={`relative overflow-hidden rounded-2xl shadow-2xl border ${
            notification.type === 'success' 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/50' 
              : 'bg-gradient-to-br from-gray-900 to-gray-800 border-red-500/50'
          } backdrop-blur-sm`}>
            {/* Animated background gradient */}
            <div className={`absolute inset-0 ${
              notification.type === 'success'
                ? 'bg-gradient-to-r from-blue-500/10 via-green-500/10 to-blue-500/10'
                : 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10'
            } animate-gradient-shift`}></div>
            
            {/* Content */}
            <div className="relative z-10 p-4 md:p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 relative ${
                  notification.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  <div className={`absolute inset-0 ${
                    notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
                  } rounded-full animate-ping`}></div>
                  <div className={`relative bg-gray-700/50 p-2 rounded-full border ${
                    notification.type === 'success' ? 'border-green-500/30' : 'border-red-500/30'
                  }`}>
                    {notification.type === 'success' ? (
                      <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                
                {/* Message */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm md:text-base mb-1">
                    {notification.type === 'success' ? 'Success!' : 'Error'}
                  </p>
                  <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                    {notification.message}
                  </p>
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => setNotification(null)}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
                  aria-label="Close notification"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    animation: `progress-bar ${notification.type === 'success' ? '4s' : '5s'} linear forwards`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyManager;

