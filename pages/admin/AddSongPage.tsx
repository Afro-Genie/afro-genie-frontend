import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSong, uploadSongImage, getAllArtists } from '../../services/firebaseService';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../../components/Notification';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Artist } from '../../types';

const AddSongPage: React.FC = () => {
  const navigate = useNavigate();
  const { notification, showNotification, hideNotification } = useNotification();
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artistId: '',
    image: '',
    genre: '',
    year: '',
    language: '',
    album: '',
    releaseDate: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const fetchedArtists = await getAllArtists();
        setArtists(fetchedArtists);
      } catch (error: any) {
        showNotification({
          message: `Error loading artists: ${error.message}`,
          type: 'error'
        });
      }
    };

    fetchArtists();
  }, [showNotification]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      let imageUrl = formData.image;

      // Add song first to get ID
      const songId = await addSong({
        title: formData.title,
        artist: formData.artist,
        artistId: formData.artistId || '',
        image: imageUrl,
        genre: formData.genre || undefined,
        year: formData.year ? parseInt(formData.year) : undefined,
        language: formData.language || undefined,
        album: formData.album || undefined,
        releaseDate: formData.releaseDate || undefined
      });

      // Upload image if provided (after getting song ID)
      if (imageFile) {
        const uploadedImageUrl = await uploadSongImage(imageFile, songId);
        // Update song with uploaded image URL
        const { updateSong } = await import('../../services/firebaseService');
        await updateSong(songId, { image: uploadedImageUrl });
      }

      showNotification({
        message: 'Song added successfully!',
        type: 'success'
      });

      setTimeout(() => {
        navigate('/admin/songs');
      }, 1500);
    } catch (error: any) {
      showNotification({
        message: `Error adding song: ${error.message}`,
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/songs')}
            className="text-gray-400 hover:text-white mb-3 sm:mb-4 flex items-center gap-2 transition-colors min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm sm:text-base">Back to Songs</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Add New Song</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Add a new song to the database</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Song Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist ID
                </label>
                <select
                  value={formData.artistId}
                  onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Artist</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Afrobeats, Hip-Hop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 2023"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Language
                </label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., English, Yoruba, Pidgin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Album
                </label>
                <input
                  type="text"
                  value={formData.album}
                  onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Image */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Image</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    setImagePreview(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Or Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {imagePreview && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Preview</label>
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-600">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
            >
              {saving ? (
                <>
                  <LoadingSpinner />
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Song
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/songs')}
              className="w-full sm:w-auto min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default AddSongPage;

