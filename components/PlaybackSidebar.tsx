import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Search,
  TrendingUp,
  Users,
  Settings,
  LogOut,
  Music,
  ChevronRight,
  History,
  Star,
  ListMusic,
  Globe,
  FileText,
  Eye,
  ArrowLeft,
} from 'lucide-react';

export type SidebarPanel = 'library' | 'explore' | 'community' | 'settings' | 'now-playing' | null;

interface PlaybackSidebarProps {
  songId: string;
  activePanel: SidebarPanel;
  onPanelChange: (panel: SidebarPanel) => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

const NAV_ITEMS: Array<{
  id: SidebarPanel;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasSubSidebar: boolean;
  href?: string;
}> = [
  {
    id: 'library',
    label: 'Personal Library',
    icon: Heart,
    hasSubSidebar: true,
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: Search,
    hasSubSidebar: true,
  },
  {
    id: 'now-playing',
    label: 'Now Playing',
    icon: TrendingUp,
    hasSubSidebar: false,
  },
  {
    id: 'community',
    label: 'Community & Contrib.',
    icon: Users,
    hasSubSidebar: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    hasSubSidebar: true,
  },
];

const PlaybackSidebar: React.FC<PlaybackSidebarProps> = ({
  songId,
  activePanel,
  onPanelChange,
  onNavigate,
  isMobile = false,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleNavClick = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.hasSubSidebar) {
      if (activePanel === item.id) {
        onPanelChange(null);
      } else {
        onPanelChange(item.id);
      }
    } else if (item.id === 'now-playing') {
      if (activePanel === item.id) {
        onPanelChange(null);
      } else {
        onPanelChange(item.id);
      }
      navigate(`/songs/${songId}`);
      onNavigate?.();
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setSigningOut(false);
    }
  };

  const userName = user?.displayName || 'Guest';
  const initial = userName[0]?.toUpperCase() || 'G';

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white">
      {/* Logo */}
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 h-16 px-5 border-b border-[#282828] hover:bg-white/5 transition-colors flex-shrink-0"
      >
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <Music className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">AfroGenie</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item, index) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id ?? `nav-${index}`}
              onClick={() => handleNavClick(item)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.hasSubSidebar && (
                <ChevronRight
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    activePanel === item.id ? 'rotate-90' : ''
                  }`}
                />
              )}
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
            {user ? (
              <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-green-900/60 text-green-400 rounded">
                MEMBER
              </span>
            ) : (
              <Link
                to="/"
                onClick={onNavigate}
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
    </div>
  );
};

export default PlaybackSidebar;
