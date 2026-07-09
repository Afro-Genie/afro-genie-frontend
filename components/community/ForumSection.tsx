import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import type { CommunityCategory, CommunityTopic } from '../../types';
import BookOpenIcon from '../icons/BookOpenIcon';
import ChatBubbleIcon from '../icons/ChatBubbleIcon';
import TranslateIcon from '../icons/TranslateIcon';
import UserGroupIcon from '../icons/UserGroupIcon';

const ICON_MAP: { [key: string]: React.ComponentType<{ className?: string }> } = {
  'chat': ChatBubbleIcon,
  'translate': TranslateIcon,
  'book': BookOpenIcon,
  'users': UserGroupIcon,
};

const ForumSection: React.FC = () => {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [latestTopics, setLatestTopics] = useState<{ [categoryId: string]: CommunityTopic }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const catsData = await apiRequest<CommunityCategory[]>('/community/categories');
      const cats = Array.isArray(catsData) ? catsData : (catsData as any).categories || (catsData as any).data || [];
      setCategories(cats);

      const topicsMap: { [categoryId: string]: CommunityTopic } = {};
      for (const cat of cats) {
        if (cat.id) {
          const topicsData = await apiRequest<any>(`/community/topics?categoryId=${cat.id}&sort=hot&limit=1`);
          const topics = topicsData.topics || topicsData.data || [];
          if (topics.length > 0) {
            topicsMap[cat.id] = topics[0];
          }
        }
      }
      setLatestTopics(topicsMap);
    } catch (error) {
      console.error('Error loading forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || ChatBubbleIcon;
    return IconComponent;
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 p-6 md:p-8 rounded-xl border border-gray-700">
        <h2 className="text-3xl font-bold text-gray-100 mb-6">Community Forums</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 p-4 rounded-lg border border-gray-700 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 md:p-8 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-100">Community Forums</h2>
        <Link
          to="/community/create"
          className="inline-flex items-center min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          Create Topic
        </Link>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No categories available yet. Categories will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const IconComponent = getIcon(category.icon || 'chat');
            const latestTopic = category.id ? latestTopics[category.id] : null;
            
            return (
              <Link
                key={category.id}
                to={`/community?category=${category.id}`}
                className="block min-h-[48px] bg-gray-800 hover:bg-gray-700/80 transition-colors duration-200 p-4 rounded-lg border border-gray-700"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <IconComponent className="h-8 w-8 text-amber-400 mt-1" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-200">{category.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{category.description}</p>
                    {latestTopic && (
                      <div className="text-xs text-gray-500 mt-2">
                        <span>Latest: "{latestTopic.title}" by <strong>{latestTopic.author?.displayName || latestTopic.authorName}</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-gray-300">{category.topicCount || 0}</div>
                    <div className="text-sm text-gray-500">Topics</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ForumSection;
