import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getTopics, likeTopic, shareTopic, isTopicLiked, searchTopics } from '../../services/firebaseService';
import { Topic } from '../../types';
import TopicCard from './TopicCard';
import CategoryFilter from './CategoryFilter';
import { getCategories } from '../../services/firebaseService';
import { ForumCategory } from '../../types';

interface TopicListProps {
  categoryId?: string;
  searchTerm?: string;
}

const TopicList: React.FC<TopicListProps> = ({ categoryId, searchTerm }) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(categoryId);
  const [sortBy, setSortBy] = useState<'latest' | 'mostLiked' | 'mostCommented'>('latest');
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
      const cats = await getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadTopics = async () => {
    setLoading(true);
    try {
      let topicsData: Topic[];
      
      if (searchTerm && searchTerm.trim()) {
        topicsData = await searchTopics(searchTerm);
      } else {
        topicsData = await getTopics(selectedCategory, sortBy, 50);
      }
      
      setTopics(topicsData);

      // Load liked status
      if (user) {
        const liked = new Set<string>();
        for (const topic of topicsData) {
          if (topic.id) {
            const isLiked = await isTopicLiked(topic.id, user.uid);
            if (isLiked) liked.add(topic.id);
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
      await likeTopic(topicId, user.uid);
      loadTopics(); // Reload to get updated like count
    } catch (error) {
      console.error('Error liking topic:', error);
      // Revert on error
      setLikedTopics(likedTopics);
    }
  };

  const handleShare = async (topicId: string) => {
    if (!user) {
      // Just copy link if not logged in
      const url = `${window.location.origin}/#/community/topic/${topicId}`;
      navigator.clipboard.writeText(url);
      return;
    }

    try {
      await shareTopic(topicId, user.uid);
      loadTopics(); // Reload to get updated share count
    } catch (error) {
      console.error('Error sharing topic:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Sort */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'latest'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setSortBy('mostLiked')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'mostLiked'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Most Liked
          </button>
          <button
            onClick={() => setSortBy('mostCommented')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === 'mostCommented'
                ? 'bg-amber-500 text-gray-900 font-semibold'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Most Discussed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with Categories */}
        <div className="lg:col-span-1">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Topics List */}
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
                  topic={topic}
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

