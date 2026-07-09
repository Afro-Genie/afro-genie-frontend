import React, { useState } from 'react';
import { Topic } from '../../types';

interface TopicActionsProps {
  topic: Topic;
  onLike?: (topicId: string) => void;
  onShare?: (topicId: string) => void;
  isLiked?: boolean;
  compact?: boolean;
}

const TopicActions: React.FC<TopicActionsProps> = ({ topic, onLike, onShare, isLiked, compact = false }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (onShare) {
      onShare(topic.id);
    } else {
      const url = `${window.location.origin}/#/community/topic/${topic.id}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleLike = () => {
    if (onLike && topic.id) {
      onLike(topic.id);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={handleLike}
          disabled={!onLike}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked
              ? 'text-red-400 hover:text-red-300'
              : 'text-gray-500 hover:text-red-400'
          } ${!onLike ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{topic.likes || 0}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-gray-500 hover:text-amber-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{topic.shares || 0}</span>
        </button>

        <div className="flex items-center gap-1.5 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{topic.commentCount || 0}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 pt-3 border-t border-gray-700">
      <button
        onClick={handleLike}
        disabled={!onLike}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          isLiked
            ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-red-400'
        } ${!onLike ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="font-medium">{topic.likes || 0}</span>
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-amber-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="font-medium">{copied ? 'Copied!' : topic.shares || 0}</span>
      </button>

      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/50 text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="font-medium">{topic.commentCount || 0}</span>
      </div>
    </div>
  );
};

export default TopicActions;

