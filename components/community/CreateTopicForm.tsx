import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createTopic, getCategories, getAllSongs, getAllArtists, uploadTopicImage } from '../../services/firebaseService';
import { ForumCategory, Song, Artist } from '../../types';

interface CreateTopicFormProps {
  initialCategory?: string;
  initialSongId?: string;
  initialArtistId?: string;
}

const CreateTopicForm: React.FC<CreateTopicFormProps> = ({ initialCategory, initialSongId, initialArtistId }) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(initialCategory || searchParams.get('category') || '');
  const [songId, setSongId] = useState(initialSongId || searchParams.get('songId') || '');
  const [artistId, setArtistId] = useState(initialArtistId || searchParams.get('artistId') || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [cats, songsData, artistsData] = await Promise.all([
          getCategories(),
          getAllSongs(),
          getAllArtists()
        ]);
        setCategories(cats);
        setSongs(songsData);
        setArtists(artistsData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to create a topic');
      return;
    }

    if (!title.trim() || !content.trim() || !category) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        // Upload image first (we'll use a temporary ID)
        const tempId = 'temp_' + Date.now();
        imageUrl = await uploadTopicImage(imageFile, tempId);
      }

      const topicId = await createTopic({
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid,
        authorName: userProfile?.displayName || user.displayName || user.email || 'Anonymous',
        authorAvatar: userProfile?.photoURL || user.photoURL || undefined,
        category,
        songId: songId || undefined,
        artistId: artistId || undefined,
        imageUrl: imageUrl || undefined
      });

      navigate(`/community/topic/${topicId}`);
    } catch (err: any) {
      console.error('Error creating topic:', err);
      setError(err.message || 'Failed to create topic. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-center">
        <p className="text-gray-400">Please sign in to create a topic</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Create New Topic</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="Enter topic title"
            maxLength={200}
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
            Category *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            disabled={submitting || loading}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Link to Song (Optional) */}
        <div>
          <label htmlFor="song" className="block text-sm font-medium text-gray-400 mb-1">
            Link to Song (Optional)
          </label>
          <select
            id="song"
            value={songId}
            onChange={(e) => setSongId(e.target.value)}
            disabled={submitting || loading}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          >
            <option value="">None</option>
            {songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title} by {song.artist}
              </option>
            ))}
          </select>
        </div>

        {/* Link to Artist (Optional) */}
        <div>
          <label htmlFor="artist" className="block text-sm font-medium text-gray-400 mb-1">
            Link to Artist (Optional)
          </label>
          <select
            id="artist"
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            disabled={submitting || loading}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          >
            <option value="">None</option>
            {artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            disabled={submitting}
            rows={8}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            placeholder="Share your thoughts, experiences, or start a discussion..."
          />
          <p className="text-xs text-gray-500 mt-1">You can use markdown for formatting</p>
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-400 mb-1">
            Image (Optional)
          </label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={submitting}
            className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-500 file:text-gray-900 file:cursor-pointer"
          />
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="mt-2 text-sm text-red-400 hover:text-red-300"
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim() || !category}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-all"
          >
            {submitting ? 'Creating...' : 'Create Topic'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/community')}
            disabled={submitting}
            className="px-6 bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTopicForm;

