import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../Avatar';
import {
  Home,
  Disc3,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  Music,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Home', href: '/artist', icon: Home, exact: true },
  { name: 'Music', href: '/artist/music', icon: Disc3, exact: false },
  { name: 'Analytics', href: '/artist/analytics', icon: BarChart3, exact: false },
  { name: 'Listeners', href: '/artist/listeners', icon: Users, exact: false },
  { name: 'Settings', href: '/artist/settings', icon: Settings, exact: false },
];

const ArtistDashboardLayout: React.FC = () => {
  const { user, userProfile, logout } = useAuth();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) return location.pathname === item.href;
    return location.pathname.startsWith(item.href);
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

  const artistName = userProfile?.artistProfile?.stageName || user?.displayName || 'Artist';

  const sidebarContent = (
    <>
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 h-16 px-5 border-b border-[#282828] hover:bg-white/5 transition-colors">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
          <Music className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">AfroGenie</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 pb-4">
        <Link
          to="/artist/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center flex-shrink-0 ring-2 ring-transparent hover:ring-green-400 transition-all">
            <Avatar
              src={userProfile?.artistProfile?.profileImageUrl}
              name={artistName}
              className="w-9 h-9"
              initialsClassName="text-sm font-bold text-white"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{artistName}</p>
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-green-900/60 text-green-400 rounded">
              ARTIST
            </span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#122118] text-white">
      {/* ── Desktop Sidebar (always visible) ─────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-[#1a1a1a] border-r border-[#282828] flex-col z-30">
        {sidebarContent}
      </aside>

      {/* ── Mobile Sidebar (toggled) ────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 h-full bg-[#1a1a1a] border-r border-[#282828] flex flex-col overflow-hidden animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 bg-[#122118]/80 backdrop-blur-md border-b border-[#282828] flex items-center px-4 md:px-8">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors mr-3"
          >
            <Menu className="w-5 h-5" />
          </button>

          {isSearchOpen ? (
            <div className="flex-1 min-w-0 animate-slide-in-from-left">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search songs, releases..."
                  className="w-full pl-10 pr-12 py-2.5 min-h-[44px] bg-[#1a1a1a] border border-white/10 rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500/30 hover:border-white/20 transition-colors"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0" />
          )}

          <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
            {!isSearchOpen && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-md text-gray-300 hover:bg-white/10 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            <button className="p-2 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <Link
              to="/artist/profile"
              className="p-2 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Avatar
                src={userProfile?.artistProfile?.profileImageUrl}
                name={artistName}
                className="h-8 w-8 sm:h-9 sm:w-9"
                initialsClassName="text-sm font-bold text-white"
              />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ArtistDashboardLayout;
