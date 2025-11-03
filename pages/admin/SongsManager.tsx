import React, { useState, useEffect } from 'react';
import { getAllSongs, addSong, updateSong, deleteSong, uploadSongImage } from '../../services/firebaseService';
import type { Song } from '../../types';

const SongsManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artistId: '',
    image: '',
    lyrics: '',
    language: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const fetchedSongs = await getAllSongs();
      setSongs(fetchedSongs);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = formData.image;

      // Upload image if provided
      if (imageFile) {
        const imagePath = `songs/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadSongImage(imageFile, imagePath);
      }

      if (editingSong) {
        await updateSong(editingSong.id, {
          title: formData.title,
          artist: formData.artist,
          artistId: formData.artistId,
          image: imageUrl,
          lyrics: formData.lyrics,
          language: formData.language
        });
      } else {
        await addSong({
          title: formData.title,
          artist: formData.artist,
          artistId: formData.artistId,
          image: imageUrl,
          lyrics: formData.lyrics,
          language: formData.language
        });
      }

      setFormData({
        title: '',
        artist: '',
        artistId: '',
        image: '',
        lyrics: '',
        language: ''
      });
      setImageFile(null);
      setImagePreview('');
      setEditingSong(null);
      setShowAddForm(false);
      fetchSongs();
    } catch (error) {
      console.error('Error saving song:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
    setFormData({
      title: song.title,
      artist: song.artist,
      artistId: song.artistId,
      image: song.image,
      lyrics: song.lyrics || '',
      language: song.language || ''
    });
    setImagePreview(song.image);
    setShowAddForm(true);
  };

  const handleDelete = async (songId: string) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      try {
        await deleteSong(songId);
        fetchSongs();
      } catch (error) {
        console.error('Error deleting song:', error);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Songs Management</h1>
          <p className="text-gray-400 mt-1">Manage songs in your database</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Add Song
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingSong ? 'Edit Song' : 'Add New Song'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Song Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Artist Name
                </label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Artist ID (if known)
                </label>
                <input
                  type="text"
                  value={formData.artistId}
                  onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Leave empty if not sure"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., English, Yoruba, Pidgin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Or Upload Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Lyrics (optional)
              </label>
              <textarea
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Paste song lyrics here..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {submitting ? 'Saving...' : (editingSong ? 'Update Song' : 'Add Song')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSong(null);
                  setFormData({
                    title: '',
                    artist: '',
                    artistId: '',
                    image: '',
                    lyrics: '',
                    language: ''
                  });
                  setImageFile(null);
                  setImagePreview('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Songs List */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Songs ({songs.length})</h2>
        </div>

        {songs.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No songs found. Add your first song above!
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {songs.map((song) => (
              <div key={song.id} className="p-6 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {song.image ? (
                    <img
                      src={song.image}
                      alt={song.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-600 flex items-center justify-center">
                      <span className="text-2xl">🎵</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-white">{song.title}</h3>
                  <p className="text-gray-400">by {song.artist}</p>
                  {song.language && (
                    <p className="text-sm text-gray-500">{song.language}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(song)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(song.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsManager;

