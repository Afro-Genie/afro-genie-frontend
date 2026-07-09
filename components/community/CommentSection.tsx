import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CommentThread from './CommentThread';
import type { TopicComment, CommunityComment } from '../../types';

interface CommentSectionProps {
  topicId: string;
  comments: TopicComment[];
  onCommentsUpdate: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ topicId, comments, onCommentsUpdate }) => {
  const { user, authFetch } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await authFetch(`/api/community/topics/${topicId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment.trim() }),
      });

      setNewComment('');
      onCommentsUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteComment = async (commentId: string, voteType: 1 | -1) => {
    await authFetch('/api/community/vote/comment', {
      method: 'POST',
      body: JSON.stringify({ commentId, voteType: voteType === 1 ? 'UPVOTE' : 'DOWNVOTE' }),
    });
    onCommentsUpdate();
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    await authFetch(`/api/community/topics/${topicId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentCommentId }),
    });
    onCommentsUpdate();
  };

  const mapToCommunityComments = (flatComments: TopicComment[]): CommunityComment[] => {
    return flatComments.map(c => ({
      id: c.id || '',
      topicId: c.topicId,
      userId: c.userId,
      parentCommentId: c.parentCommentId,
      content: c.content,
      likes: c.likes,
      createdAt: typeof c.createdAt === 'object' && c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : c.createdAt || new Date().toISOString(),
      user: {
        id: c.userId,
        displayName: c.userName,
        photoUrl: c.userAvatar,
      },
    }));
  };

  return (
    <div className="space-y-6">
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

      <CommentThread
        comments={mapToCommunityComments(comments)}
        topicId={topicId}
        onVoteComment={handleVoteComment}
        onReply={handleReply}
      />
    </div>
  );
};

export default CommentSection;
