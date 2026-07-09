import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import type { CommunityCategory } from '../types';

const CommunityPage: React.FC = () => {
  const { user, authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch('/api/community/categories');
      setCategories(data.categories || data.data || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleJoin = async (categoryId: string, isMember: boolean) => {
    setCategories(prev =>
      prev.map(c =>
        c.id === categoryId
          ? { ...c, isMember: !isMember, memberCount: isMember ? c.memberCount - 1 : c.memberCount + 1 }
          : c
      )
    );
    try {
      await authFetch(`/api/community/categories/${categoryId}/join`, { method: 'POST' });
    } catch (err: any) {
      setCategories(prev =>
        prev.map(c =>
          c.id === categoryId
            ? { ...c, isMember, memberCount: isMember ? c.memberCount + 1 : c.memberCount - 1 }
            : c
        )
      );
      showNotification({ message: err.message || 'Failed to join community', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center p-6 sm:p-8 bg-gray-800/50 rounded-xl border border-gray-700">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-100">Community</h1>
            <p className="mt-4 text-base sm:text-lg text-gray-400 max-w-3xl mx-auto">
              Join genre communities to discuss and share your love for African music.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-4" />
                  <div className="h-10 bg-gray-700 rounded w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchCategories}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No communities available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors"
                >
                  <Link to={`/community/${category.id}`} className="block mb-4">
                    <h3 className="text-xl font-bold text-gray-100 hover:text-amber-400 transition-colors">{category.name}</h3>
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span>{category.memberCount} members</span>
                    <span>{category.topicCount} topics</span>
                  </div>
                  <button
                    onClick={() => handleJoin(category.id, !!category.isMember)}
                    disabled={!user}
                    className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                      category.isMember
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {category.isMember ? 'Joined' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default CommunityPage;
