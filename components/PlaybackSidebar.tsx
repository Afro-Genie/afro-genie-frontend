import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MediaImage from './MediaImage';
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
    label: 'Community & Contribution',
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
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const userRole = userProfile?.role ? userProfile.role.toUpperCase() : user ? 'USER' : null;
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
    <div className="relative flex h-full flex-col overflow-hidden bg-[#08130f] text-white">
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <Link
        to="/"
        onClick={onNavigate}
        className="relative flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-600 text-[#07110d] shadow-[0_0_24px_rgba(52,211,153,0.22)]">
          <Music className="size-[18px]" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <span className="block text-[15px] font-bold tracking-tight">AfroGenie</span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-300/65">Sound. Culture. Connection.</span>
        </div>
      </Link>

      <nav aria-label="Playback navigation" className="relative flex-1 overflow-y-auto px-3.5 py-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Your space</p>
        <div className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item, index) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id ?? `nav-${index}`}
                onClick={() => handleNavClick(item)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                  isActive
                    ? 'bg-emerald-300/[0.13] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.12)]'
                    : 'text-white/60 hover:bg-white/[0.055] hover:text-white'
                }`}
              >
                {isActive && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />}
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-emerald-300/10 text-emerald-200' : 'text-white/45 group-hover:text-white/85'}`}>
                  <item.icon className="size-[17px]" strokeWidth={1.8} />
                </span>
                <span className="flex-1 truncate text-left">{item.label}</span>
                {item.hasSubSidebar && (
                  <ChevronRight className={`size-4 shrink-0 text-white/30 transition-transform ${isActive ? 'rotate-90 text-emerald-200' : 'group-hover:translate-x-0.5'}`} />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-7 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-200"><Globe className="size-3.5" /></span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Made for the culture</span>
          </div>
          <p className="text-xs leading-relaxed text-white/70">Discover the stories and meaning behind every lyric.</p>
        </div>
      </nav>

      <div className="relative shrink-0 border-t border-white/[0.07] p-3.5">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-300 to-emerald-700 ring-1 ring-white/10">
            <MediaImage
              src={user?.photoURL}
              alt=""
              className="size-9 rounded-xl object-cover"
              fallback={<span className="text-sm font-bold text-[#07110d]">{initial}</span>}
              fallbackClassName="flex items-center justify-center"
            />
          </div>
          <div className="min-w-0 flex-1">
            {authLoading ? (
              <div className="flex flex-col gap-1.5" aria-label="Loading profile">
                <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
                <div className="h-2 w-12 rounded bg-white/[0.07] animate-pulse" />
              </div>
            ) : (
              <>
                <p className="truncate text-xs font-semibold text-white/90">{userName}</p>
                {userRole ? (
                  <span className="mt-1 inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[0.08] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-200">{userRole}</span>
                ) : (
                  <Link to="/" onClick={onNavigate} className="text-[11px] text-white/45 transition-colors hover:text-emerald-200">Sign in to your account</Link>
                )}
              </>
            )}
          </div>
          {user && (
            <button
              onClick={handleLogout}
              disabled={signingOut}
              aria-label={signingOut ? 'Signing out' : 'Sign out'}
              title={signingOut ? 'Signing out...' : 'Sign out'}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaybackSidebar;
