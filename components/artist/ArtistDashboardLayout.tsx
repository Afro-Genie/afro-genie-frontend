import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoIcon from '../icons/LogoIcon';
import {
  StatsIcon,
  MusicNoteIcon,
  ArtistIcon,
  TrendingUpIcon,
  SettingsIcon,
} from '../icons/FlatIcons';

const ArtistDashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Overview', href: '/artist', icon: StatsIcon },
    { name: 'Catalog', href: '/artist/catalog', icon: MusicNoteIcon },
    { name: 'Releases', href: '/artist/releases', icon: ArtistIcon },
    { name: 'Analytics', href: '/artist/analytics', icon: TrendingUpIcon },
    { name: 'Profile', href: '/artist/profile', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#122118]">
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-lg border-r border-gray-700">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
            <LogoIcon className="h-8 w-8 text-green-400" />
            <span className="ml-2 text-xl font-bold text-white">AfroGenie Artist</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive =
                item.href === '/artist'
                  ? location.pathname === '/artist'
                  : location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-gray-700">
            <div className="flex items-center mb-4">
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
                  {user?.displayName || 'Artist'}
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
      </div>

      <div className="ml-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ArtistDashboardLayout;
