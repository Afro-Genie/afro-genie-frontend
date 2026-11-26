import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MediaImage from '../MediaImage';
import LogoIcon from '../icons/LogoIcon';
import {
  MessageSquare,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  Compass,
  Users,
  LogOut,
  ChevronRight,
  Globe,
  type LucideIcon,
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
  icon: LucideIcon;
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
  const { user, userProfile, loading: authLoading, logout } = useAuth();
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
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <Link
        to="/"
        onClick={onMobileClose}
        className="relative flex h-[76px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-5 transition-colors hover:bg-white/[0.03] [@media(max-height:640px)]:h-14"
      >
        <LogoIcon className="h-5 w-5 shrink-0 text-green-400" />
        <span className="text-lg font-bold text-white">AfroGenie</span>
      </Link>

      <nav aria-label="Community navigation" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-6 [@media(max-height:640px)]:py-3">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 [@media(max-height:640px)]:mb-2">Community</p>
        <div className="flex flex-col gap-1.5 [@media(max-height:640px)]:gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 [@media(max-height:640px)]:min-h-9 ${
                  isActive
                    ? 'bg-emerald-300/[0.13] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.12)]'
                    : 'text-white/60 hover:bg-white/[0.055] hover:text-white'
                }`}
              >
                {isActive && <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />}
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-emerald-300/10 text-emerald-200' : 'text-white/45 group-hover:text-white/85'}`}>
                  <Icon className="size-[17px]" strokeWidth={1.8} />
                </span>
                <span className="flex-1 truncate text-left">{tab.label}</span>
                <ChevronRight className={`size-4 shrink-0 text-white/30 transition-transform ${isActive ? 'rotate-90 text-emerald-200' : 'group-hover:translate-x-0.5'}`} />
              </button>
            );
          })}
        </div>
        <div className="mt-7 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-3.5 [@media(max-height:640px)]:mt-4 [@media(max-height:640px)]:p-2.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-200"><Globe className="size-3.5" /></span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Made for the culture</span>
          </div>
          <p className="text-xs leading-relaxed text-white/70">Share knowledge, correct lyrics, and celebrate the stories behind every song.</p>
        </div>
      </nav>

      <div className="relative shrink-0 border-t border-white/[0.07] p-3.5 [@media(max-height:640px)]:p-2">
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
                  <Link to="/" onClick={onMobileClose} className="text-[11px] text-white/45 transition-colors hover:text-emerald-200">Sign in to your account</Link>
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
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="relative hidden h-full min-h-0 w-[260px] min-w-[260px] max-w-[260px] shrink-0 flex-col overflow-hidden border-r border-white/[0.07] bg-[#08130f] text-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onMobileClose} />
          <aside className="relative h-full w-[min(88vw,340px)] flex flex-col overflow-hidden border-r border-white/[0.07] bg-[#08130f] text-white animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
});

export default CommunitySidebar;
