import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VoteButtons from './VoteButtons';
import type { CommunityComment } from '../../types';

interface CommentThreadProps {
  comments: CommunityComment[];
  topicId: string;
  depth?: number;
  onVoteComment: (commentId: string, voteType: 1 | -1) => Promise<void>;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
}

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

const CommentItem: React.FC<{
  comment: CommunityComment;
  topicId: string;
  depth: number;
  onVoteComment: (commentId: string, voteType: 1 | -1) => Promise<void>;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
}> = ({ comment, topicId, depth, onVoteComment, onReply }) => {
  const { user } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const displayName = comment.user?.displayName || 'Unknown';
  const avatar = comment.user?.photoUrl;

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  };

  const indentClass = depth === 1
    ? 'ml-6 pl-4 border-l-2 border-gray-700'
    : depth === 2
    ? 'ml-12 pl-4 border-l-2 border-gray-700'
    : '';

  return (
    <div className={depth > 0 ? `mt-4 ${indentClass}` : 'mt-4'}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {avatar ? (
            <img src={avatar} alt={displayName} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {displayName[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-200 text-sm">{displayName}</span>
              <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <VoteButtons
              score={comment.likes}
              userVote={null}
              onVote={(voteType) => onVoteComment(comment.id, voteType)}
              size="sm"
            />
            {user && depth < 2 && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
              >
                Reply
              </button>
            )}
          </div>
          {showReply && (
            <form onSubmit={handleSubmitReply} className="mt-3">
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
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReply(false); setReplyContent(''); }}
                  className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  topicId={topicId}
                  depth={depth + 1}
                  onVoteComment={onVoteComment}
                  onReply={onReply}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CommentThread: React.FC<CommentThreadProps> = ({ comments, topicId, depth = 0, onVoteComment, onReply }) => {
  const buildCommentTree = (flatComments: CommunityComment[]): CommunityComment[] => {
    const map = new Map<string, CommunityComment>();
    const roots: CommunityComment[] = [];

    flatComments.forEach(c => map.set(c.id, { ...c, replies: [] }));

    flatComments.forEach(c => {
      const withReplies = map.get(c.id)!;
      if (c.parentCommentId) {
        const parent = map.get(c.parentCommentId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(withReplies);
        } else {
          roots.push(withReplies);
        }
      } else {
        roots.push(withReplies);
      }
    });

    return roots;
  };

  const tree = buildCommentTree(comments);

  return (
    <div className="space-y-2">
      {tree.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No comments yet.</p>
      ) : (
        tree.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            topicId={topicId}
            depth={depth}
            onVoteComment={onVoteComment}
            onReply={onReply}
          />
        ))
      )}
    </div>
  );
};

export default CommentThread;
