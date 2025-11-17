import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TopicComment } from '../../types';
import { addComment, likeComment, isCommentLiked, deleteComment } from '../../services/firebaseService';

interface CommentSectionProps {
  topicId: string;
  comments: TopicComment[];
  onCommentsUpdate: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ topicId, comments, onCommentsUpdate }) => {
  const { user, userProfile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load liked status for all comments
    const loadLikedStatus = async () => {
      if (!user) return;
      const liked = new Set<string>();
      for (const comment of comments) {
        if (comment.id) {
          const isLiked = await isCommentLiked(comment.id, user.uid);
          if (isLiked) liked.add(comment.id);
        }
      }
      setLikedComments(liked);
    };
    loadLikedStatus();
  }, [comments, user]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await addComment({
        topicId,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || user.email || 'Anonymous',
        userAvatar: userProfile?.photoURL || user.photoURL || undefined,
        content: newComment.trim(),
        parentCommentId: replyingTo || undefined
      });
      
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
      onCommentsUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    const wasLiked = likedComments.has(commentId);
    const newLiked = new Set(likedComments);
    
    if (wasLiked) {
      newLiked.delete(commentId);
    } else {
      newLiked.add(commentId);
    }
    setLikedComments(newLiked);

    try {
      await likeComment(commentId, user.uid);
      onCommentsUpdate();
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert on error
      setLikedComments(likedComments);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId, topicId);
      onCommentsUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Build comment tree
  const buildCommentTree = (comments: TopicComment[]): (TopicComment & { replies?: TopicComment[] })[] => {
    const commentMap = new Map<string, TopicComment & { replies?: TopicComment[] }>();
    const rootComments: (TopicComment & { replies?: TopicComment[] })[] = [];

    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id!, { ...comment, replies: [] });
    });

    // Second pass: build tree
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id!)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const renderComment = (comment: TopicComment & { replies?: TopicComment[] }, depth: number = 0) => {
    const isLiked = comment.id ? likedComments.has(comment.id) : false;
    const canDelete = user && (user.uid === comment.userId || userProfile?.role === 'admin' || userProfile?.role === 'moderator');

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4 border-l-2 border-gray-700 pl-4' : ''}`}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.userAvatar ? (
              <img
                src={comment.userAvatar}
                alt={comment.userName}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {comment.userName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-200 text-sm">{comment.userName}</span>
                  <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                </div>
                {canDelete && (
                  <button
                    onClick={() => comment.id && handleDeleteComment(comment.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-2 ml-11">
              <button
                onClick={() => comment.id && handleLikeComment(comment.id)}
                disabled={!user}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  isLiked
                    ? 'text-red-400'
                    : 'text-gray-500 hover:text-red-400'
                } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{comment.likes || 0}</span>
              </button>

              {user && depth < 2 && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id || null)}
                  className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                >
                  Reply
                </button>
              )}
            </div>

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (replyContent.trim()) {
                  setNewComment(replyContent);
                  handleSubmitComment(e);
                }
              }} className="mt-3 ml-11">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || submitting}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
                  >
                    Post Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4">
                {comment.replies.map(reply => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const commentTree = buildCommentTree(comments);

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            rows={4}
            disabled={submitting}
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center">
          <p className="text-gray-400">Sign in to join the conversation</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {commentTree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          commentTree.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};

export default CommentSection;

