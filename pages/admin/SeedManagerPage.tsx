import React, { useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

const GENRE_OPTIONS = [
  'afrobeats', 'afropop', 'amapiano', 'highlife',
  'afro-fusion', 'dancehall', 'rnb', 'hip-hop',
];

const SeedManagerPage: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState('afrobeats');
  const [genreLimit, setGenreLimit] = useState(50);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/api/admin/seeder/status');
      setStatus(data);
    } catch {
      // status fetch is non-critical
    }
  };

  const seedByGenre = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch('/api/admin/seeder/spotify-genre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: selectedGenre, limit: genreLimit }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  const seedByPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch('/api/admin/seeder/spotify-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() }),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#122118] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Catalog <span className="text-green-400">Seeder</span>
        </h1>
        <p className="text-gray-400 mb-6">
          Import songs, artists, and albums from Spotify into your database
        </p>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
            <h3 className="text-green-300 font-semibold mb-1">Seeding Complete</h3>
            <p className="text-green-200 text-sm">
              Songs created: {result.songsCreated} | Artists created: {result.artistsCreated} | Albums created: {result.albumsCreated} | Errors: {result.errors}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seed by Genre */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Seed by Genre</h2>
            <p className="text-sm text-gray-400 mb-4">
              Import top tracks for a specific genre from Spotify
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
            >
              {GENRE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-300 mb-2">Limit</label>
            <input
              type="number"
              value={genreLimit}
              onChange={(e) => setGenreLimit(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
            />
            <button
              onClick={seedByGenre}
              disabled={loading}
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Seeding...' : `Import ${genreLimit} ${selectedGenre} Tracks`}
            </button>
          </div>

          {/* Seed by Playlist */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Seed by Playlist</h2>
            <p className="text-sm text-gray-400 mb-4">
              Import all tracks from a Spotify playlist
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">Playlist URL or ID</label>
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/... or spotify:playlist:..."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4"
            />
            <button
              onClick={seedByPlaylist}
              disabled={loading || !playlistUrl.trim()}
              className="w-full min-h-[44px] bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Seeding...' : 'Import Playlist'}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Seeder Status</h2>
            <button
              onClick={fetchStatus}
              className="text-sm text-green-400 hover:text-green-300 min-h-[44px] px-4"
            >
              Refresh
            </button>
          </div>
          {status ? (
            <div className="text-sm text-gray-300 space-y-1">
              <p>Last seed: {status.lastSeed ? new Date(status.lastSeed).toLocaleString() : 'Never'}</p>
              {status.lastResult && (
                <p>Last result: {status.lastResult.songsCreated} songs, {status.lastResult.artistsCreated} artists, {status.lastResult.albumsCreated} albums</p>
              )}
              <p>Available seeders: {status.availableSeeders?.join(', ') || 'N/A'}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Click refresh to load status</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeedManagerPage;
