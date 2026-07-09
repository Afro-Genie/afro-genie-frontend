import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import type { CommunityTopic, CommunityCategory } from '../../types';
import TopicCard from './TopicCard';
import CategoryFilter from './CategoryFilter';

interface TopicListProps {
  categoryId?: string;
  searchTerm?: string;
}

const TopicList: React.FC<TopicListProps> = ({ categoryId, searchTerm }) => {
  const { user, authFetch } = useAuth();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryId);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [loading, setLoading] = useState(true);
  const [likedTopics, setLikedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTopics();
  }, [selectedCategory, sortBy, searchTerm]);

  const loadCategories = async () => {
    try {
      const data = await apiRequest<CommunityCategory[]>('/community/categories');
      const cats = Array.isArray(data) ? data : (data as any).categories || (data as any).data || [];
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTopics = async () => {
    setLoading(true);
    try {
      let topicsData: CommunityTopic[];

      if (searchTerm && searchTerm.trim()) {
        const data = await apiRequest<any>(`/community/topics?search=${encodeURIComponent(searchTerm)}&sort=${sortBy}&limit=50`);
        topicsData = data.topics || data.data || [];
      } else {
        const params = new URLSearchParams();
        if (selectedCategory) params.set('categoryId', selectedCategory);
        params.set('sort', sortBy);
        params.set('limit', '50');
        const data = await apiRequest<any>(`/community/topics?${params.toString()}`);
        topicsData = data.topics || data.data || [];
      }

      setTopics(topicsData);

      if (user) {
        const liked = new Set<string>();
        for (const topic of topicsData) {
          if (topic.userVote === 'UPVOTE' || (topic as any).userVote === 'UPVOTE') {
            liked.add(topic.id);
          }
        }
        setLikedTopics(liked);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (topicId: string) => {
    if (!user) return;

    const wasLiked = likedTopics.has(topicId);
    const newLiked = new Set(likedTopics);

    if (wasLiked) {
      newLiked.delete(topicId);
    } else {
      newLiked.add(topicId);
    }
    setLikedTopics(newLiked);

    try {
      await authFetch(`/api/community/vote/topic`, {
        method: 'POST',
        body: JSON.stringify({ topicId, voteType: 'UPVOTE' }),
      });
      loadTopics();
    } catch (error) {
      console.error('Error liking topic:', error);
      setLikedTopics(likedTopics);
    }
  };

  const handleShare = async (topicId: string) => {
    if (!user) {
      const url = `${window.location.origin}/#/community/topic/${topicId}`;
      navigator.clipboard.writeText(url);
      return;
    }
    console.warn('shareTopic: Not available via API yet');
  };

  const mapTopicForCard = (topic: CommunityTopic) => ({
    id: topic.id,
    title: topic.title,
    content: topic.content,
    authorId: topic.author?.id || topic.authorId,
    authorName: topic.author?.displayName || topic.authorName,
    authorAvatar: topic.author?.photoUrl || topic.authorAvatar,
    category: topic.forumCategory?.name || topic.category,
    likes: topic.likes,
    shares: 0,
    commentCount: topic.commentCount,
    createdAt: topic.createdAt,
    isPinned: topic.isPinned,
    isLocked: topic.isLocked,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('hot')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'hot'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Hot
          </button>
          <button
            onClick={() => setSortBy('new')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'new'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setSortBy('top')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'top'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Top
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
              ))}
            </div>
          ) : topics.length === 0 ? (
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700 text-center">
              <p className="text-gray-400 text-lg mb-2">No topics found</p>
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Try a different search term' : 'Be the first to start a discussion!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={mapTopicForCard(topic) as any}
                  onLike={handleLike}
                  onShare={handleShare}
                  isLiked={topic.id ? likedTopics.has(topic.id) : false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicList;
