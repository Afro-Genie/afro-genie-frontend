import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  Compass,
  Users,
  Music,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export type CommunityTab =
  | 'feed'
  | 'trending'
  | 'forum-categories'
  | 'for-you'
  | 'explore'
  | 'recommended-moderators';

interface TabItem {
  key: CommunityTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: TabItem[] = [
  { key: 'feed', label: 'Feed', icon: MessageSquare },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'for-you', label: 'For You', icon: Sparkles },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'forum-categories', label: 'Forum Categories', icon: LayoutGrid },
  { key: 'recommended-moderators', label: 'Moderators', icon: Users },
];

interface CommunitySidebarProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const CommunitySidebar: React.FC<CommunitySidebarProps> = React.memo(({ activeTab, onTabChange, mobileOpen, onMobileClose }) => {
  const { user, userProfile, logout } = useAuth();
  const userRole = userProfile?.role ? userProfile.role.toUpperCase() : user ? 'USER' : null;
  const [signingOut, setSigningOut] = useState(false);

  const handleTabClick = (tab: CommunityTab) => {
    onTabChange(tab);
    onMobileClose?.();
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
    } catch {
      setSigningOut(false);
    }
  };

  const userName = user?.displayName || 'Guest';
  const initial = userName[0]?.toUpperCase() || 'G';

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 h-16 px-5 border-b border-[#282828] hover:bg-white/5 transition-colors flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <Music className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">AfroGenie</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{tab.label}</span>
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 transition-transform ${
                  isActive ? 'rotate-90' : ''
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0 ring-2 ring-transparent">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-white">{initial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            {userRole ? (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-green-900/60 text-green-400 rounded">
                {userRole}
              </span>
            ) : (
              <Link
                to="/"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
        {user && (
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-[#1a1a1a] border-r border-[#282828] flex-shrink-0 self-stretch">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="relative w-64 h-full bg-[#1a1a1a] border-r border-[#282828] flex flex-col overflow-hidden animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
});

export default CommunitySidebar;
