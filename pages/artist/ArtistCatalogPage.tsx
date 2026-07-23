import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  SearchIcon,
  CancelIcon,
  SaveIcon,
} from '../../components/icons/FlatIcons';

interface Song {
  id: string;
  title: string;
  views: number;
  releaseLink?: string;
  lyricsStatus?: string;
  genres?: string[];
  languages?: string[];
  createdAt: string;
  rawText?: string;
}

const ArtistCatalogPage: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    rawText: '',
    genres: '',
    languages: '',
  });

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: Song[] } | Song[]>('/artists/me/songs');
      setSongs(Array.isArray(data) ? data : data.data ?? []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingSong(null);
    setForm({ title: '', rawText: '', genres: '', languages: '' });
    setShowModal(true);
  };

  const openEditModal = (song: Song) => {
    setEditingSong(song);
    setForm({
      title: song.title,
      rawText: song.rawText || '',
      genres: song.genres?.join(', ') || '',
      languages: song.languages?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        lyrics: form.rawText ? { rawText: form.rawText } : undefined,
        genres: form.genres
          ? form.genres.split(',').map((g) => g.trim()).filter(Boolean)
          : [],
        languages: form.languages
          ? form.languages.split(',').map((l) => l.trim()).filter(Boolean)
          : [],
      };

      if (editingSong) {
        await apiRequest(`/artists/me/songs/${editingSong.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/artists/me/songs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      fetchSongs();
    } catch (error) {
      console.error('Error saving song:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this song?')) return;
    try {
      await apiRequest(`/artists/me/songs/${id}`, { method: 'DELETE' });
      fetchSongs();
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Catalog</h1>
          <p className="text-gray-400 mt-1">Manage your songs</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Song
        </button>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <MusicNoteIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>{search ? 'No songs match your search' : 'No songs yet. Add your first song!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Views</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Lyrics</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{song.title}</div>
                      {song.releaseLink && (
                        <a
                          href={song.releaseLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:underline"
                        >
                          Release link
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {song.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          song.lyricsStatus === 'APPROVED' || song.lyricsStatus === 'approved'
                            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                            : song.lyricsStatus
                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                            : 'bg-gray-700 text-gray-400 border border-gray-600'
                        }`}
                      >
                        {song.lyricsStatus || 'No lyrics'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(song.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(song)}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(song.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {editingSong ? 'Edit Song' : 'Add New Song'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <CancelIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Lyrics</label>
                <textarea
                  value={form.rawText}
                  onChange={(e) => setForm({ ...form, rawText: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Paste raw lyrics here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Genres (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.genres}
                  onChange={(e) => setForm({ ...form, genres: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Afrobeats, Afro-pop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Languages (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. English, Yoruba"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                  <SaveIcon className="w-4 h-4" />
                  {submitting ? 'Saving...' : editingSong ? 'Update Song' : 'Add Song'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { MusicNoteIcon } from '../../components/icons/FlatIcons';

export default ArtistCatalogPage;
