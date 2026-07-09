import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../hooks/useNotification';
import Notification from '../components/Notification';
import VoteButtons from '../components/community/VoteButtons';
import CommentThread from '../components/community/CommentThread';
import type { CommunityTopic, CommunityComment } from '../types';

const formatTimeAgo = (timestamp: string) => {
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

const getCategoryId = (topic: CommunityTopic): string =>
  topic.forumCategory?.id || topic.forumCategoryId;

const getAuthor = (topic: CommunityTopic) =>
  topic.author || { id: topic.authorId, displayName: topic.authorName, photoUrl: topic.authorAvatar };

const getAuthorName = (topic: CommunityTopic) =>
  topic.author?.displayName || topic.authorName;

const getAuthorAvatar = (topic: CommunityTopic) =>
  topic.author?.photoUrl || topic.authorAvatar;

const TopicDetailPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user, userProfile, authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isModOrAdmin = user && (user.role === 'MODERATOR' || user.role === 'ADMIN' || userProfile?.role === 'moderator' || userProfile?.role === 'admin');

  const fetchTopic = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    try {
      const data = await authFetch(`/api/community/topics/${topicId}`);
      setTopic(data);
      setComments(data.comments || []);
    } catch (err: any) {
      showNotification({ message: err.message || 'Failed to load topic', type: 'error' });
      navigate('/community');
    } finally {
      setLoading(false);
    }
  }, [topicId, authFetch, showNotification, navigate]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handleVoteTopic = async (voteType: 1 | -1) => {
    if (!topicId) return;
    await authFetch(`/api/community/vote/topic`, {
      method: 'POST',
      body: JSON.stringify({ topicId, voteType: voteType === 1 ? 'UPVOTE' : 'DOWNVOTE' }),
    });
  };

  const handleVoteComment = async (commentId: string, voteType: 1 | -1) => {
    if (!topicId) return;
    await authFetch(`/api/community/vote/comment`, {
      method: 'POST',
      body: JSON.stringify({ commentId, voteType: voteType === 1 ? 'UPVOTE' : 'DOWNVOTE' }),
    });
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    if (!topicId) return;
    await authFetch(`/api/community/topics/${topicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentCommentId }),
    });
    fetchTopic();
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicId || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await authFetch(`/api/community/topics/${topicId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      setCommentText('');
      fetchTopic();
    } catch (err: any) {
      showNotification({ message: err.message || 'Failed to post comment', type: 'error' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePin = async () => {
    if (!topicId) return;
    try {
      await authFetch(`/api/community/topics/${topicId}/pin`, { method: 'PATCH' });
      showNotification({ message: topic?.isPinned ? 'Topic unpinned' : 'Topic pinned', type: 'success' });
      fetchTopic();
    } catch (err: any) {
      showNotification({ message: err.message || 'Failed to pin topic', type: 'error' });
    }
  };

  const handleLock = async () => {
    if (!topicId) return;
    try {
      await authFetch(`/api/community/topics/${topicId}/lock`, { method: 'PATCH' });
      showNotification({ message: topic?.isLocked ? 'Topic unlocked' : 'Topic locked', type: 'success' });
      fetchTopic();
    } catch (err: any) {
      showNotification({ message: err.message || 'Failed to lock topic', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-700 rounded w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-gray-400">Topic not found</p>
            <Link to="/community" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">Back to Community</Link>
          </div>
        </div>
      </div>
    );
  }

  const categoryId = getCategoryId(topic);
  const authorName = getAuthorName(topic);
  const authorAvatar = getAuthorAvatar(topic);

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link
            to={`/community/${categoryId}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 pt-1">
                <VoteButtons
                  score={topic.likes}
                  userVote={topic.userVote === 'UPVOTE' ? 1 : topic.userVote === 'DOWNVOTE' ? -1 : null}
                  onVote={handleVoteTopic}
                />
              </div>
              <div className="flex-1 min-w-0">
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
                          <img src={authorAvatar} alt={authorName} className="h-6 w-6 rounded-full" />
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
                      <span>•</span>
                      <span>{topic.commentCount} comments</span>
                    </div>
                  </div>
                  {isModOrAdmin && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={handlePin}
                        className={`p-2 rounded-lg transition-colors ${
                          topic.isPinned ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
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
                          topic.isLocked ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                        title={topic.isLocked ? 'Unlock' : 'Lock'}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                  {topic.content}
                </div>
              </div>
            </div>
          </div>

          {topic.isLocked ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-center">
              <p className="text-yellow-400">This topic is locked and no longer accepting new comments.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {user ? (
                <form onSubmit={handleSubmitComment} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    rows={4}
                    disabled={submittingComment}
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={!commentText.trim() || submittingComment}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition-colors"
                    >
                      {submittingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center">
                  <p className="text-gray-400">Sign in to join the conversation</p>
                </div>
              )}
              <CommentThread
                comments={comments}
                topicId={topicId!}
                onVoteComment={handleVoteComment}
                onReply={handleReply}
              />
            </div>
          )}
        </div>
      </div>
      <Notification notification={notification} onClose={hideNotification} />
    </div>
  );
};

export default TopicDetailPage;
