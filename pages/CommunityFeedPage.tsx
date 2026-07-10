import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import TopicCard from '../components/community/TopicCard';
import CreateTopicModal from '../components/community/CreateTopicModal';
import type { CommunityTopic } from '../types';

type SortBy = 'hot' | 'new' | 'top';

const CommunityFeedPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user, userProfile, authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('hot');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const canCreate = !!user;

  const fetchTopics = useCallback(async (pageNum: number, append: boolean = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryId) params.set('categoryId', categoryId);
      params.set('sort', sortBy);
      params.set('page', String(pageNum));
      const data = await authFetch(`/api/community/topics?${params.toString()}`);
      const newTopics = data.topics || data.data || [];
      if (append) {
        setTopics(prev => [...prev, ...newTopics]);
      } else {
        setTopics(newTopics);
      }
      setHasMore(newTopics.length >= 20);
    } catch (err: any) {
      showNotification({ message: err.message || 'Failed to load topics', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [categoryId, sortBy, authFetch, showNotification]);

  useEffect(() => {
    setPage(1);
    fetchTopics(1);
  }, [fetchTopics]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTopics(next, true);
  };

  const handleCreateTopic = async (title: string, content: string) => {
    await authFetch('/api/community/topics', {
      method: 'POST',
      body: JSON.stringify({ title, content, forumCategoryId: categoryId }),
    });
    showNotification({ message: 'Topic created successfully!', type: 'success' });
    setPage(1);
    fetchTopics(1);
  };

  const sortTabs: { key: SortBy; label: string }[] = [
    { key: 'hot', label: 'Hot' },
    { key: 'new', label: 'New' },
    { key: 'top', label: 'Top' },
  ];

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/community"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-100 capitalize">{categoryId} Forum</h1>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Create Topic
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {sortTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setSortBy(tab.key)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortBy === tab.key
                    ? 'bg-amber-500 text-gray-900 font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading && topics.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-700 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-5/6" />
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 text-center">
              <p className="text-gray-400 text-lg mb-2">No topics yet</p>
              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Create the first topic
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                />
              ))}
              {hasMore && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <CreateTopicModal
        categoryId={categoryId || ''}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTopic}
      />
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default CommunityFeedPage;
