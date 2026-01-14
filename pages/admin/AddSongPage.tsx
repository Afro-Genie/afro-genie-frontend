import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addSong, uploadSongImage, getAllArtists, saveTranslation } from '../../services/firebaseService';
import { getAllLanguages, addLanguage } from '../../services/languageService';
import { useNotification } from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import Notification from '../../components/Notification';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Artist, Language } from '../../types';

const AddSongPage: React.FC = () => {
  const navigate = useNavigate();
  const { notification, showNotification, hideNotification } = useNotification();
  const { user } = useAuth();
  
  const [artists, setArtists] = useState<Artist[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [showAddLanguage, setShowAddLanguage] = useState(false);
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [newLanguageName, setNewLanguageName] = useState('');
  const [saving, setSaving] = useState(false);
  const [copyrightAcknowledged, setCopyrightAcknowledged] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artistId: '',
    image: '',
    genre: '',
    year: '',
    language: '',
    album: '',
    releaseDate: '',
    lyrics: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedArtists, fetchedLanguages] = await Promise.all([
          getAllArtists(),
          getAllLanguages()
        ]);
        setArtists(fetchedArtists);
        setLanguages(fetchedLanguages);
      } catch (error: any) {
        showNotification({
          message: `Error loading data: ${error.message}`,
          type: 'error'
        });
      }
    };

    fetchData();
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

      // Save lyrics if provided
      if (formData.lyrics && formData.lyrics.trim().length > 0 && user) {
        await saveTranslation({
          songId,
          userId: user.uid,
          originalLyrics: formData.lyrics.trim(),
          translatedLyrics: '', // Will be translated later using AI
          culturalContext: '',
          sourceLang: formData.language || 'en',
          targetLang: 'en',
          source: 'manual',
          status: 'approved'
        });
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
                {!showAddLanguage ? (
                  <div className="space-y-2">
                    <select
                      value={formData.language}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowAddLanguage(true);
                        } else {
                          setFormData({ ...formData, language: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Language</option>
                      {languages.map(lang => (
                        <option key={lang.id} value={lang.code}>{lang.name}</option>
                      ))}
                      <option value="__add_new__">+ Add New Language</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newLanguageCode}
                        onChange={(e) => setNewLanguageCode(e.target.value)}
                        className="px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Code (e.g., yo)"
                      />
                      <input
                        type="text"
                        value={newLanguageName}
                        onChange={(e) => setNewLanguageName(e.target.value)}
                        className="px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Name (e.g., Yoruba)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (newLanguageCode.trim() && newLanguageName.trim()) {
                            try {
                              await addLanguage({
                                code: newLanguageCode.trim().toLowerCase(),
                                name: newLanguageName.trim(),
                                isActive: true
                              });
                              const { getAllLanguages } = await import('../../services/languageService');
                              const updatedLanguages = await getAllLanguages();
                              setLanguages(updatedLanguages);
                              setFormData({ ...formData, language: newLanguageCode.trim().toLowerCase() });
                              setNewLanguageCode('');
                              setNewLanguageName('');
                              setShowAddLanguage(false);
                              showNotification({
                                message: 'Language added successfully!',
                                type: 'success'
                              });
                            } catch (error: any) {
                              showNotification({
                                message: `Error adding language: ${error.message}`,
                                type: 'error'
                              });
                            }
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddLanguage(false);
                          setNewLanguageCode('');
                          setNewLanguageName('');
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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

          {/* Lyrics */}
          <div className="border-t border-gray-700 pt-6 mt-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Original Lyrics</h2>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lyrics (Original Language)
              </label>
              <textarea
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                rows={15}
                className="w-full px-4 py-3 text-base bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono resize-y min-h-[300px]"
                placeholder="Enter the original lyrics here. Translation can be generated later using AI."
              />
              <p className="text-xs text-gray-400 mt-2">
                Add the original lyrics. AI translation can be generated later from the song page.
              </p>
            </div>
          </div>

          {/* Image */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Image</h2>
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

          {/* Copyright Acknowledgment */}
          <div className="border-t border-gray-700 pt-6 mt-6">
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyrightAcknowledged}
                  onChange={(e) => setCopyrightAcknowledged(e.target.checked)}
                  className="mt-1 w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
                  required
                />
                <div className="flex-1">
                  <span className="text-white font-medium">Copyright Acknowledgment *</span>
                  <p className="text-gray-300 text-sm mt-1">
                    I confirm that I have the right to upload these lyrics. The lyrics are either:
                    (1) my original work, (2) licensed from the copyright owner, or (3) provided through a licensed API.
                    I understand that original lyrics remain the property of their copyright owners.
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    By checking this box, you agree to our <Link to="/terms" className="text-green-400 hover:underline">Terms of Use</Link>.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4 border-t border-gray-700">
            <button
              type="submit"
              disabled={saving || !copyrightAcknowledged}
              className="w-full sm:w-auto min-h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
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

