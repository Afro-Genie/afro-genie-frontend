import React, { useState, useEffect } from 'react';
import { uploadArtistImage } from '../../services/firebaseService';
import { useAuth } from '../../context/AuthContext';
import { getArtists } from '../../lib/apiClient';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';
import type { Artist } from '../../types';

const ArtistsManager: React.FC = () => {
  const { authFetch } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', genre: '', image: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const response = await getArtists({ limit: 200 });
      const artistsData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];

      setArtists(
        artistsData.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genre: Array.isArray(artist.genres) ? artist.genres[0] || '' : artist.genre || '',
          image: artist.imageUrl || artist.image || '',
          spotifyId: artist.spotifyId,
          bio: artist.bio,
          popularity: artist.popularity,
          followers: artist.followers,
          externalUrl: artist.externalUrl,
          genres: artist.genres || [],
        }))
      );
    } catch (error) {
      console.error('Error fetching artists:', error);
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
        const imagePath = `artists/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadArtistImage(imageFile, imagePath);
      }

      if (editingArtist) {
        await authFetch('/api/artists/' + editingArtist.id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            bio: editingArtist.bio || '',
            imageUrl: imageUrl || undefined,
            spotifyId: editingArtist.spotifyId || undefined,
            genres: formData.genre ? [formData.genre] : editingArtist.genres || [],
            popularity: editingArtist.popularity ?? 0,
            followers: editingArtist.followers ?? 0,
            externalUrl: editingArtist.externalUrl || undefined,
            verified: false,
          }),
        });
      } else {
        await authFetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            bio: '',
            imageUrl: imageUrl || undefined,
            spotifyId: undefined,
            genres: formData.genre ? [formData.genre] : [],
            popularity: 0,
            followers: 0,
            externalUrl: undefined,
            verified: false,
          }),
        });
      }

      setFormData({ name: '', genre: '', image: '' });
      setImageFile(null);
      setImagePreview('');
      setEditingArtist(null);
      setShowAddForm(false);
      fetchArtists();
    } catch (error) {
      console.error('Error saving artist:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({ name: artist.name, genre: artist.genre, image: artist.image });
    setImagePreview(artist.image);
    setShowAddForm(true);
  };

  const handleDelete = async (artistId: string) => {
    if (window.confirm('Are you sure you want to delete this artist?')) {
      try {
        await authFetch('/api/artists/' + artistId, { method: 'DELETE' });
        fetchArtists();
      } catch (error) {
        console.error('Error deleting artist:', error);
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
      <AdminListPageSkeleton rows={6} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Artists Management</h1>
          <p className="text-gray-400 mt-1">Manage artists in your database</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Add Artist
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingArtist ? 'Edit Artist' : 'Add New Artist'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Artist Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Genre
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
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

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {submitting ? 'Saving...' : (editingArtist ? 'Update Artist' : 'Add Artist')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingArtist(null);
                  setFormData({ name: '', genre: '', image: '' });
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

      {/* Artists List */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Artists ({artists.length})</h2>
        </div>

        {artists.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No artists found. Add your first artist above!
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {artists.map((artist) => (
              <div key={artist.id} className="p-6 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-600 flex items-center justify-center">
                      <span className="text-2xl">🎤</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-white">{artist.name}</h3>
                  <p className="text-gray-400">{artist.genre}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(artist)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(artist.id)}
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

export default ArtistsManager;

