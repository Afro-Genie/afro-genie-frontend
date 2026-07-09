import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import CommentThread from './CommentThread';
import TopicActions from './TopicActions';
import type { CommunityTopic, CommunityComment } from '../../types';

const TopicDetail: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user, authFetch } = useAuth();
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  const isModOrAdmin = user && (user.role === 'MODERATOR' || user.role === 'ADMIN');

  useEffect(() => {
    if (topicId) {
      loadTopic();
    }
  }, [topicId]);

  const loadTopic = async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/community/topics/${topicId}`);
      setTopic(data);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading topic:', error);
      navigate('/community');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!topic?.id || !user) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);

    try {
      await authFetch('/api/community/vote/topic', {
        method: 'POST',
        body: JSON.stringify({ topicId: topic.id, voteType: 'UPVOTE' }),
      });
      loadTopic();
    } catch (error) {
      console.error('Error liking topic:', error);
      setIsLiked(wasLiked);
    }
  };

  const handleShare = async () => {
    if (!topic?.id) return;
    const url = `${window.location.origin}/#/community/topic/${topic.id}`;
    navigator.clipboard.writeText(url);
  };

  const handleDelete = async () => {
    if (!topic?.id || !isModOrAdmin) return;
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    try {
      await authFetch(`/api/community/topics/${topic.id}`, { method: 'DELETE' });
      navigate('/community');
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const handlePin = async () => {
    if (!topic?.id || !isModOrAdmin) return;
    try {
      await authFetch(`/api/community/topics/${topic.id}/pin`, { method: 'PATCH' });
      loadTopic();
    } catch (error) {
      console.error('Error pinning topic:', error);
    }
  };

  const handleLock = async () => {
    if (!topic?.id || !isModOrAdmin) return;
    try {
      await authFetch(`/api/community/topics/${topic.id}/lock`, { method: 'PATCH' });
      loadTopic();
    } catch (error) {
      console.error('Error locking topic:', error);
    }
  };

  const handleVoteComment = async (commentId: string, voteType: 1 | -1) => {
    await authFetch('/api/community/vote/comment', {
      method: 'POST',
      body: JSON.stringify({ commentId, voteType: voteType === 1 ? 'UPVOTE' : 'DOWNVOTE' }),
    });
    loadTopic();
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    if (!topicId) return;
    await authFetch(`/api/community/topics/${topicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentCommentId }),
    });
    loadTopic();
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const authorName = topic?.author?.displayName || topic?.authorName;
  const authorAvatar = topic?.author?.photoUrl || topic?.authorAvatar;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 text-center">
          <p className="text-gray-400">Topic not found</p>
          <Link to="/community" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Link
        to="/community"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Community
      </Link>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {topic.isPinned && (
              <div className="flex items-center gap-2 mb-2 text-amber-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <span>Pinned</span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-100 mb-2">{topic.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {authorName?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <span className="font-semibold text-gray-300">{authorName}</span>
              </div>
              <span>•</span>
              <span>{formatTimeAgo(topic.createdAt)}</span>
              {topic.forumCategory && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                    {topic.forumCategory.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {isModOrAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handlePin}
                className={`p-2 rounded-lg transition-colors ${
                  topic.isPinned
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={topic.isPinned ? 'Unpin' : 'Pin'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>
              <button
                onClick={handleLock}
                className={`p-2 rounded-lg transition-colors ${
                  topic.isLocked
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
                title={topic.isLocked ? 'Unlock' : 'Lock'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {topic.imageUrl && (
          <div className="mb-4">
            <img
              src={topic.imageUrl}
              alt={topic.title}
              className="w-full max-h-96 object-cover rounded-lg"
            />
          </div>
        )}

        <div className="prose prose-invert max-w-none mb-6">
          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {topic.content}
          </div>
        </div>

        {!topic.isLocked && (
          <TopicActions
            topic={topic as any}
            onLike={handleLike}
            onShare={handleShare}
            isLiked={isLiked}
          />
        )}

        {topic.isLocked && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-center">
            <p className="text-yellow-400">This topic is locked and no longer accepting new comments.</p>
          </div>
        )}
      </div>

      {!topic.isLocked && (
        <CommentThread
          comments={comments}
          topicId={topic.id!}
          onVoteComment={handleVoteComment}
          onReply={handleReply}
        />
      )}
    </div>
  );
};

export default TopicDetail;
