import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserIcon from '../icons/UserIcon';
import PremiumBadge from '../PremiumBadge';
import { useNotification } from '../../hooks/useNotification';
import Notification from '../Notification';

interface UserMenuProps {
  onLoginClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLoginClick }) => {
  const { user, isAdmin, isArtist, isSpotifyPremium, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { notification, showNotification, hideNotification } = useNotification();

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
      showNotification({
        message: 'Failed to log out. Please try again.',
        type: 'error'
      });
    } finally {
      setLoggingOut(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center space-x-2 sm:space-x-4" data-testid="user-menu">
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-sm text-gray-300 max-w-[160px] truncate">{user.displayName || user.email || 'User'}</span>
          {isArtist && (
            <Link 
              to="/artist/dashboard" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center"
            >
              Artist Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="User menu"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-transparent hover:ring-green-400 transition-all"
              />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center ring-2 ring-transparent hover:ring-green-400 transition-all">
                <span className="text-sm font-medium text-white">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <svg 
              className={`w-4 h-4 ml-1 hidden sm:block transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-1 z-20 border border-gray-700">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-sm text-white font-medium truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  {isArtist && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-purple-900/50 text-purple-300 rounded mr-1">
                      Artist
                    </span>
                  )}
                  {isAdmin && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-900/50 text-green-300 rounded">
                      Admin
                    </span>
                  )}
                  {isSpotifyPremium && user.spotifyId && (
                    <PremiumBadge variant="compact" className="mt-1" />
                  )}
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    to="/community"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center min-h-[44px] px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <UserIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                    Profile & Community
                  </Link>

                  <Link
                    to="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center min-h-[44px] px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                    {!isSpotifyPremium && user.spotifyId && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    )}
                  </Link>

                  <Link
                    to="/request-translation"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center min-h-[44px] px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Request Translation
                  </Link>

                  {isArtist && (
                    <Link
                      to="/artist/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      Artist Dashboard
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center min-h-[44px] px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Admin Panel
                    </Link>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-gray-700 py-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center w-full min-h-[44px] px-4 py-3 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onLoginClick}
      className="bg-green-600 hover:bg-green-700 text-white font-semibold min-h-[44px] py-2.5 px-4 rounded-full transition-colors"
    >
      Sign In
    </button>
  );
};

export default UserMenu;
