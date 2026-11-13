import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoIcon from '../icons/LogoIcon';
import { Menu, X } from 'lucide-react';
import { 
  MusicNoteIcon, 
  ArtistIcon, 
  GenreIcon, 
  UsersIcon, 
  GridIcon,
  StatsIcon,
  ChatIcon
} from '../icons/FlatIcons';
import RobotIcon from '../icons/RobotIcon';
import GlobeIcon from '../icons/GlobeIcon';

const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: StatsIcon },
    { name: 'Unified Manager', href: '/admin/unified', icon: GridIcon },
    { name: 'Artist Applications', href: '/admin/artist-applications', icon: ArtistIcon },
    { name: 'Artists', href: '/admin/artists', icon: ArtistIcon },
    { name: 'Songs', href: '/admin/songs', icon: MusicNoteIcon },
    { name: 'Genres', href: '/admin/genres', icon: GenreIcon },
    { name: 'Languages', href: '/admin/languages', icon: GlobeIcon },
    { name: 'Community', href: '/admin/community', icon: ChatIcon },
    { name: 'Users', href: '/admin/users', icon: UsersIcon },
    { name: 'Role Requests', href: '/admin/role-requests', icon: UsersIcon },
    { name: 'Rewards & Badges', href: '/admin/rewards', icon: StatsIcon },
    { name: 'Store', href: '/admin/store', icon: StatsIcon },
    { name: 'Genie Settings', href: '/admin/genie', icon: RobotIcon },
    { name: 'Moderation', href: '/moderator', icon: StatsIcon },
  ];

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 bg-gray-900 flex-shrink-0">
        <Link to="/admin" className="flex items-center min-w-0">
          <LogoIcon className="h-8 w-8 text-green-400 flex-shrink-0" />
          <span className="ml-2 text-lg font-bold text-white truncate">AfroGenie Admin</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden ml-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <item.icon className="mr-3 w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="px-3 py-4 border-t border-gray-700 flex-shrink-0">
        <div className="flex items-center mb-4 px-1">
          <div className="flex-shrink-0">
            {user?.photoURL ? (
              <img
                className="h-8 w-8 rounded-full"
                src={user.photoURL}
                alt="User avatar"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-lg flex-col z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[85vw] h-full bg-gray-800 shadow-lg flex flex-col overflow-hidden animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors mr-3"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center min-w-0">
            <LogoIcon className="h-6 w-6 text-green-400 flex-shrink-0" />
            <span className="ml-2 text-base font-bold text-white truncate">AfroGenie Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
