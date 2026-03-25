import React, { useState, useEffect } from 'react';
import { getAllGenres, addGenre, updateGenre, deleteGenre, uploadGenreImage } from '../../services/firebaseService';
import type { Genre } from '../../types';

const GenresManager: React.FC = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', image: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const fetchedGenres = await getAllGenres();
      setGenres(fetchedGenres);
    } catch (error) {
      console.error('Error fetching genres:', error);
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
        const imagePath = `genres/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadGenreImage(imageFile, imagePath);
      }

      if (editingGenre) {
        await updateGenre(editingGenre.id, {
          name: formData.name,
          image: imageUrl
        });
      } else {
        await addGenre({
          name: formData.name,
          image: imageUrl
        });
      }

      setFormData({ name: '', image: '' });
      setImageFile(null);
      setImagePreview('');
      setEditingGenre(null);
      setShowAddForm(false);
      fetchGenres();
    } catch (error) {
      console.error('Error saving genre:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre);
    setFormData({ name: genre.name, image: genre.image });
    setImagePreview(genre.image);
    setShowAddForm(true);
  };

  const handleDelete = async (genreId: string) => {
    if (!genreId) {
      alert('This genre has no ID. Refresh the page and try again.');
      await fetchGenres();
      return;
    }
    if (!window.confirm('Are you sure you want to delete this genre?')) return;

    try {
      await deleteGenre(genreId);
      fetchGenres();
    } catch (error: any) {
      console.error('Error deleting genre:', error);
      const msg =
        error?.code === 'permission-denied'
          ? 'Permission denied. You must be signed in as an admin to delete genres.'
          : (error?.message || 'Could not delete the genre.');
      alert(msg);
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
          <h1 className="text-3xl font-bold text-white">Genres Management</h1>
          <p className="text-gray-400 mt-1">Manage music genres in your database</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Add Genre
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            {editingGenre ? 'Edit Genre' : 'Add New Genre'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Genre Name
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
                {submitting ? 'Saving...' : (editingGenre ? 'Update Genre' : 'Add Genre')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingGenre(null);
                  setFormData({ name: '', image: '' });
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

      {/* Genres List */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Genres ({genres.length})</h2>
        </div>

        {genres.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No genres found. Add your first genre above!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
            {genres.map((genre) => (
              <div key={genre.id} className="bg-gray-700 rounded-lg p-4 flex flex-col items-center text-center">
                <div className="mb-3">
                  {genre.image ? (
                    <img
                      src={genre.image}
                      alt={genre.name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-2xl">🎼</span>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-medium text-white mb-3">{genre.name}</h3>
                <div className="flex space-x-2 w-full">
                  <button
                    onClick={() => handleEdit(genre)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(genre.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors"
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

export default GenresManager;

