import React, { useState } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';
import CommunityLayout from '../components/community/CommunityLayout';
import CommunityHeader from '../components/community/CommunityHeader';
import FeedView from '../components/community/FeedView';
import TrendingView from '../components/community/TrendingView';
import ForumCategoriesView from '../components/community/ForumCategoriesView';
import ForYouView from '../components/community/ForYouView';
import ExploreView from '../components/community/ExploreView';
import RecommendedModeratorsView from '../components/community/RecommendedModeratorsView';
import CreateTopicForm from '../components/community/CreateTopicForm';
import type { CommunityTab } from '../components/community/CommunitySidebar';

const tabViews: Record<CommunityTab, React.ReactNode> = {
  'feed': <FeedView />,
  'trending': <TrendingView />,
  'forum-categories': <ForumCategoriesView />,
  'for-you': <ForYouView />,
  'explore': <ExploreView />,
  'recommended-moderators': <RecommendedModeratorsView />,
};

const bannerData: Record<CommunityTab, { title: string; description?: string; chips?: { label: string }[] }> = {
  'feed': {
    title: 'Feed',
    description: 'Recent discussions from the community.',
    chips: [{ label: 'Latest' }, { label: 'All categories' }],
  },
  'trending': {
    title: 'Trending',
    description: 'Hot topics right now — driven by engagement and views.',
    chips: [{ label: 'Popular' }, { label: 'Active' }],
  },
  'forum-categories': {
    title: 'Forum Categories',
    description: 'Browse all discussion categories. Pick one to explore topics and join the conversation.',
    chips: [{ label: 'Categories' }, { label: 'Browse' }],
  },
  'for-you': {
    title: 'For You',
    description: 'Personalized topic recommendations based on your listening history and interactions.',
    chips: [{ label: 'Recommended' }, { label: 'Personalized' }],
  },
  'explore': {
    title: 'Explore',
    description: 'What the community is listening to — top albums, genres, tracks, and playlists.',
    chips: [{ label: 'Music' }, { label: 'Trending' }],
  },
  'recommended-moderators': {
    title: 'Recommended Moderators',
    description: 'Top contributors who help keep the community safe and organized.',
    chips: [{ label: 'Moderators' }, { label: 'Contributors' }],
  },
};

const isValidTab = (t: string | null): t is CommunityTab =>
  t !== null && ['feed', 'trending', 'forum-categories', 'for-you', 'explore', 'recommended-moderators'].includes(t);

const CommunityPage: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [exploreSearch, setExploreSearch] = useState('');

  const isCreateView = location.pathname.includes('/create');
  const tab = searchParams.get('tab');
  const activeTab: CommunityTab = isValidTab(tab) ? tab : 'feed';

  const handleTabChange = (t: CommunityTab) => {
    setSearchParams({ tab: t }, { replace: true });
  };

  if (isCreateView) {
    return (
      <div className="min-h-screen bg-[#122118]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <Link
                to="/community?tab=recommended-moderators"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Community
              </Link>
            </div>
            <CreateTopicForm />
          </div>
        </div>
      </div>
    );
  }

  const showCreateAction = activeTab === 'recommended-moderators';

  const handleExploreSearch = () => {
    const q = exploreSearch.trim();
    if (!q) return;
    navigate(`/search/${encodeURIComponent(q)}`);
  };

  const header = (
    <CommunityHeader
      {...bannerData[activeTab]}
      actionPlacement={activeTab === 'explore' ? 'before-title' : activeTab === 'recommended-moderators' ? 'after-chips' : undefined}
      action={activeTab === 'explore' ? (
        <div className="relative w-full">
          <input
            type="text"
            value={exploreSearch}
            onChange={(e) => setExploreSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleExploreSearch(); }}
            placeholder="Search songs, artists..."
            className="w-full sm:w-56 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 text-sm rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-green-500/30 border border-white/10 hover:border-white/20 transition-colors"
          />
          <button
            onClick={handleExploreSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      ) : showCreateAction ? (
        <Link
          to="/community/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg transition-colors text-sm shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Topic
        </Link>
      ) : undefined}
    />
  );

  return (
    <div className="h-screen bg-[#122118] flex">
      <CommunityLayout activeTab={activeTab} onTabChange={handleTabChange} header={header}>
        <ErrorBoundary>
          {tabViews[activeTab]}
        </ErrorBoundary>
      </CommunityLayout>
    </div>
  );
};

export default CommunityPage;
