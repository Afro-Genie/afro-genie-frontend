import React, { useState, useEffect, useCallback } from 'react';
import { communityApi } from '../../services/communityService';
import TopicCard from './TopicCard';
import type { CommunityTopicExtended, UserListeningPreference } from '../../types';

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

const ForYouView: React.FC = React.memo(() => {
  const [topics, setTopics] = useState<CommunityTopicExtended[]>([]);
  const [prefs, setPrefs] = useState<UserListeningPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchAll = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [topicRes, prefsRes] = await Promise.allSettled([
        communityApi.getForYou({ page: pageNum, limit: 20 }),
        communityApi.getListeningPreferences(),
      ]);
      if (topicRes.status === 'fulfilled') {
        const items = topicRes.value.topics || [];
        setTopics(prev => (append ? [...prev, ...items] : items));
        setHasMore(items.length >= 20);
      }
      if (prefsRes.status === 'fulfilled') {
        setPrefs(prefsRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); fetchAll(1, false); }, [fetchAll]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAll(next, true);
  };

  if (loading && topics.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-40 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-700 rounded-full w-20" />
            <div className="h-6 bg-gray-700 rounded-full w-16" />
            <div className="h-6 bg-gray-700 rounded-full w-24" />
          </div>
        </div>
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
        <button onClick={() => fetchAll(1, false)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prefs && (prefs.genreIds.length > 0 || prefs.languageCodes.length > 0) && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Based on your listening</h3>
          <div className="flex flex-wrap gap-2">
            {prefs.genreIds.map(g => (
              <span key={g} className="px-2 py-0.5 bg-green-900/50 text-green-300 text-xs rounded-full">{g}</span>
            ))}
            {prefs.languageCodes.map(l => (
              <span key={l} className="px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-full">{l}</span>
            ))}
          </div>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-gray-400 text-lg mb-1">No recommendations yet</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Start listening to music and interacting with topics to get personalized recommendations.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
});

export default ForYouView;
