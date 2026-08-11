import React, { useCallback, useEffect, useState } from 'react';
import { communityApi, type TopicItem } from '../../services/communityService';

const CommunityTopics: React.FC = () => {
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await communityApi.listTopics({ page, limit: 20, search: search || undefined });
      setTopics(result.topics);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load topics:', err);
      setError('Failed to load community topics.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleAction = async (
    id: string,
    action: () => Promise<unknown>,
  ) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await loadTopics();
    } catch (err) {
      console.error('Community moderation action failed:', err);
      setError('Action failed. You need MODERATOR or ADMIN access.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (topic: TopicItem) => {
    if (window.confirm(`Delete topic "${topic.title}"? This soft-deletes its content.`)) {
      handleAction(topic.id, () => communityApi.deleteTopic(topic.id));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Community Topics Moderation</h1>
      <p className="text-gray-400 mb-6">
        Pin, lock, or delete topics. Each action is logged and earns a +5 token moderation reward.
      </p>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search topics..."
          className="w-full max-w-md px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
      </div>

      {error && <div className="mb-4 p-3 bg-red-900/50 text-red-200 rounded-lg">{error}</div>}

      {loading ? (
        <div className="text-gray-400">Loading topics...</div>
      ) : topics.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">No topics found.</div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-gray-800 rounded-lg p-5 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {topic.isPinned && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-yellow-600 text-white rounded-full">Pinned</span>
                    )}
                    {topic.isLocked && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-600 text-white rounded-full">Locked</span>
                    )}
                    <span className="text-xs text-gray-400">{topic.category?.name}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white truncate">{topic.title}</h2>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{topic.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    by {topic.author?.displayName} · {topic.commentCount} comments · {topic.likes} likes ·{' '}
                    {new Date(topic.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      handleAction(topic.id, () => communityApi.pinTopic(topic.id))
                    }
                    disabled={busyId === topic.id}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      topic.isPinned
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    } disabled:opacity-50`}
                  >
                    {topic.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() =>
                      handleAction(topic.id, () => communityApi.lockTopic(topic.id))
                    }
                    disabled={busyId === topic.id}
                    className="px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {topic.isLocked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => confirmDelete(topic)}
                    disabled={busyId === topic.id}
                    className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CommunityTopics;
