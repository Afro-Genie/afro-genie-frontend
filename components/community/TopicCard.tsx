import React from 'react';
import { Link } from 'react-router-dom';
import { CommunityTopic } from '../../types';
import TopicActions from './TopicActions';

interface TopicCardProps {
  topic: CommunityTopic;
  onLike?: (topicId: string) => void;
  onShare?: (topicId: string) => void;
  isLiked?: boolean;
}

const getAuthorName = (topic: CommunityTopic) =>
  topic.author?.displayName || topic.authorName || 'Unknown';

const getAuthorAvatar = (topic: CommunityTopic) =>
  topic.author?.photoUrl || topic.authorAvatar || '';

const getCategoryName = (topic: CommunityTopic) =>
  topic.forumCategory?.name || (typeof topic.category === 'object' ? topic.category.name : topic.category) || '';

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

const truncateContent = (content: string, maxLength: number = 150) => {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
};

const TopicCard: React.FC<TopicCardProps> = ({ topic, onLike, onShare, isLiked }) => {
  const authorName = getAuthorName(topic);
  const authorAvatar = getAuthorAvatar(topic);
  const categoryName = getCategoryName(topic);

  return (
    <div className={`bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200 rounded-lg border ${topic.isPinned ? 'border-amber-400/50' : 'border-gray-700'} p-5`}>
      {topic.isPinned && (
        <div className="flex items-center gap-2 mb-2 text-amber-400 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          <span>Pinned</span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {authorName[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link
              to={`/community/topic/${topic.id}`}
              className="flex-1 group"
            >
              <h3 className="text-lg font-bold text-gray-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                {topic.title}
              </h3>
            </Link>
            {topic.isLocked && (
              <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-3 line-clamp-3">
            {truncateContent(topic.content)}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <span className="font-semibold text-gray-400">{authorName}</span>
            </span>
            <span>•</span>
            <span>{formatTimeAgo(topic.createdAt)}</span>
            {categoryName && (
              <>
                <span>•</span>
                <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                  {categoryName}
                </span>
              </>
            )}
          </div>

          <TopicActions
            topic={topic}
            onLike={onLike}
            onShare={onShare}
            isLiked={isLiked}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default TopicCard;

