import React from 'react';
import { useNavigate } from 'react-router-dom';
import CommunityContentCard from './CommunityContentCard';
import { CommunityTopicExtended } from '../../types';
import TopicActions from './TopicActions';

interface TopicCardProps {
  topic: CommunityTopicExtended;
  onLike?: (topicId: string) => void;
  onShare?: (topicId: string) => void;
  isLiked?: boolean;
}

const getAuthorName = (topic: CommunityTopicExtended) =>
  topic.author?.displayName || topic.authorName || 'Unknown';

const getAuthorAvatar = (topic: CommunityTopicExtended) =>
  topic.author?.photoUrl || topic.authorAvatar || '';

const getCategoryName = (topic: CommunityTopicExtended) =>
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

const TopicCard: React.FC<TopicCardProps> = React.memo(({ topic, onLike, onShare, isLiked }) => {
  const navigate = useNavigate();
  const authorName = getAuthorName(topic);
  const authorAvatar = getAuthorAvatar(topic);
  const categoryName = getCategoryName(topic);

  const stats = [
    ...(topic.viewCount !== undefined ? [{ label: 'views' as const, value: topic.viewCount }] : []),
    ...(topic.commentCount !== undefined ? [{ label: 'comments' as const, value: topic.commentCount }] : []),
    ...(topic.likes !== undefined ? [{ label: 'likes' as const, value: topic.likes }] : []),
  ];

  return (
    <div className={`relative ${topic.isModeratorOnly ? 'border-l-4 border-l-blue-500' : ''}`}>
      {topic.isModeratorOnly && (
        <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full shadow">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Moderator&apos;s Pick
        </div>
      )}
      <CommunityContentCard
        imageUrl={topic.imageUrl}
        title={topic.title}
        subtitle={`${authorName} • ${formatTimeAgo(topic.createdAt)}`}
        stats={stats.length > 0 ? stats : undefined}
        onClick={() => navigate(`/community/topic/${topic.id}`)}
      >
        <p className="text-gray-400 text-xs mt-2 line-clamp-2">{truncateContent(topic.content)}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="h-5 w-5 rounded-full" />
              ) : (
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">{authorName[0]?.toUpperCase() || 'U'}</span>
                </div>
              )}
            </div>
            {categoryName && (
              <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300 text-[10px]">{categoryName}</span>
            )}
          </div>
          <TopicActions topic={topic} onLike={onLike} onShare={onShare} isLiked={isLiked} compact />
        </div>
      </CommunityContentCard>
    </div>
  );
});

export default TopicCard;
