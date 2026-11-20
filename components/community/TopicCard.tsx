import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MessageCircle } from 'lucide-react';
import { CommunityTopicExtended } from '../../types';
import { toMediaUrl } from '../../lib/apiBase';
import Avatar from '../Avatar';
import TopicActions from './TopicActions';

interface TopicCardProps {
  topic: CommunityTopicExtended;
  onLike?: (topicId: string) => void;
  onShare?: (topicId: string) => void;
  isLiked?: boolean;
}

const getAuthorName = (topic: CommunityTopicExtended) =>
  topic.author?.displayName || topic.authorName || 'Unknown';

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

const TopicCard: React.FC<TopicCardProps> = React.memo(({ topic, onLike, onShare, isLiked }) => {
  const navigate = useNavigate();
  const authorName = getAuthorName(topic);
  const categoryName = getCategoryName(topic);

  const openTopic = () => navigate(`/community/topic/${topic.id}`);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openTopic}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTopic();
        }
      }}
      className={`flex min-h-[320px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-[#151d1b] shadow-sm transition-colors hover:border-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:flex-row ${
        topic.isModeratorOnly ? 'border-blue-500/60' : 'border-gray-700/80'
      }`}
    >
      <div className="relative h-64 shrink-0 bg-[#101715] p-3 md:h-auto md:w-[36%] md:min-w-[260px] md:max-w-[340px]">
        <div className="relative h-full min-h-[220px] overflow-hidden rounded-lg bg-gray-900/50">
          {topic.imageUrl ? (
            <img
              src={toMediaUrl(topic.imageUrl)}
              alt={topic.title}
              loading="lazy"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-green-950/60 via-gray-900 to-gray-950" />
          )}
          {categoryName && (
            <span className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] truncate rounded-full border border-white/10 bg-[#151d1b]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-200 backdrop-blur-sm">
              <span className="mr-1.5 text-amber-400">•</span>
              {categoryName}
            </span>
          )}
          {topic.isModeratorOnly && (
            <span className="absolute bottom-3 left-3 rounded-full border border-blue-300/20 bg-blue-950/90 px-2.5 py-1 text-[10px] font-semibold text-blue-100">
              Moderator&apos;s Pick
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5 md:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            src={topic.author?.photoUrl || topic.authorAvatar}
            name={authorName}
            alt=""
            className="h-10 w-10 shrink-0 border border-gray-600"
            initialsClassName="text-sm font-semibold text-white"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-100">{authorName}</p>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              Shared {formatTimeAgo(topic.createdAt)}
              {categoryName && <><span className="mx-1.5 text-gray-600">·</span>{categoryName}</>}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">Community story</p>
          <h3 className="mt-2 line-clamp-2 font-serif text-2xl font-medium leading-tight tracking-tight text-gray-50 md:text-3xl">
            {topic.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-300">{topic.content}</p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-gray-700/80 pt-4">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-gray-500" />
              <strong className="font-medium text-gray-200">{topic.viewCount ?? 0}</strong>
              <span>views</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <strong className="font-medium text-gray-200">{topic.commentCount}</strong>
              <span>replies</span>
            </span>
          </div>
          <div onClick={(event) => event.stopPropagation()}>
            <TopicActions topic={topic} onLike={onLike} onShare={onShare} isLiked={isLiked} compact />
          </div>
        </div>
      </div>
    </article>
  );
});

export default TopicCard;
