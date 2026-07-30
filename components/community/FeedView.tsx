import React, { useState, useEffect, useCallback } from 'react';
import { communityApi } from '../../services/communityService';
import TopicCard from './TopicCard';
import type { CommunityTopicExtended } from '../../types';

function TopicCardSkeleton() {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden animate-pulse">
      <div className="p-4">
        <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
        <div className="h-3 bg-gray-700 rounded w-1/2 mb-3" />
        <div className="h-3 bg-gray-700 rounded w-full mb-2" />
        <div className="h-3 bg-gray-700 rounded w-5/6 mb-4" />
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 bg-gray-700 rounded-full" />
          <div className="h-3 bg-gray-700 rounded w-16" />
          <div className="h-3 bg-gray-700 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

function EmptyFeedIcon() {
  return (
    <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

const FeedView: React.FC = React.memo(() => {
  const [topics, setTopics] = useState<CommunityTopicExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetch = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityApi.getFeed({ page: pageNum, limit: 20 });
      const items = res.topics || [];
      setTopics(prev => (append ? [...prev, ...items] : items));
      setHasMore(items.length >= 20);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); fetch(1, false); }, [fetch]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetch(next, true);
  };

  if (loading && topics.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <TopicCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => fetch(1, false)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Retry</button>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
        <EmptyFeedIcon />
        <p className="text-gray-400 text-lg mb-1">No topics yet</p>
        <p className="text-gray-500 text-sm">Be the first to start a discussion!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map(topic => <TopicCard key={topic.id} topic={topic} />)}
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
  );
});

export default FeedView;
