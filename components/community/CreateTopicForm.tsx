import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import { uploadImage } from '../../services/uploadService';
import type { CommunityCategory } from '../../types';

interface CreateTopicFormProps {
  initialCategory?: string;
  initialSongId?: string;
  initialArtistId?: string;
}

const CreateTopicForm: React.FC<CreateTopicFormProps> = ({ initialCategory, initialSongId, initialArtistId }) => {
  const { user, userProfile, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(initialCategory || searchParams.get('category') || '');
  const [songId, setSongId] = useState(initialSongId || searchParams.get('songId') || '');
  const [artistId, setArtistId] = useState(initialArtistId || searchParams.get('artistId') || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await apiRequest<CommunityCategory[]>('/community/categories');
        const cats = Array.isArray(data) ? data : (data as any).categories || (data as any).data || [];
        setCategories(cats);
      } catch (err) {
        console.error('Error loading categories:', err);
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
        const tempId = 'temp_' + Date.now();
        imageUrl = await uploadImage(imageFile, `topics/${tempId}/${imageFile.name}`);
      }

      const result = await authFetch('/api/community/topics', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          forumCategoryId: category,
          songId: songId || undefined,
          artistId: artistId || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      navigate(`/community/topic/${result.id}`);
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
