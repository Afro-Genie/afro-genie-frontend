import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from './icons/LogoIcon';
import MenuIcon from './icons/MenuIcon';
import SearchBar from './SearchBar';
import UserMenu from './auth/UserMenu';
import LoginModal from './auth/LoginModal';
import Notification, { NotificationData } from './Notification';
import { useAuth } from '../context/AuthContext';
import { markNotificationAsRead, subscribeToUnreadNotifications } from '../services/firebaseService';
import { featureFlags } from '../config/featureFlags';
import { trackEvent } from '../services/telemetryService';
import type { AppNotification } from '../types';

const Header: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<NotificationData | null>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsLoginModalOpen(true);
      setToast({ message: 'Session expired. Please sign in again.', type: 'error', duration: 5000 });
    };

    const handleLoginModalOpen = () => {
      setIsLoginModalOpen(true);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    window.addEventListener('login-modal:open', handleLoginModalOpen);
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired);
      window.removeEventListener('login-modal:open', handleLoginModalOpen);
    };
  }, []);

  useEffect(() => {
    // Wait for AuthContext to finish initializing so Firestore has an auth token.
    if (loading) return;
    if (!user?.uid || !featureFlags.requestCompletionNotifications) return;
    let seen = new Set<string>();
    const unsubscribe = subscribeToUnreadNotifications(user.uid, async (items: AppNotification[]) => {
      const next = items.find((item) => item.id && !seen.has(item.id));
      if (!next || !next.id) return;
      seen.add(next.id);
      trackEvent('request_notification_received', { source: next.sourceCollection || 'unknown' });
      setToast({ message: `${next.title}\n${next.message}`, type: 'info', duration: 6000 });
      await markNotificationAsRead(next.id);
    });
    return () => unsubscribe();
  }, [user?.uid, loading]);

  return (
    <>
      <header className="bg-[#1A2B22]/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10 flex-shrink-0">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
              <LogoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
              <span className="text-lg sm:text-xl font-bold text-white">AfroGenie</span>
            </Link>

            {/* Search, Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="flex-1 min-w-0 hidden sm:block">
                <SearchBar variant="header" />
              </div>
              <Link
                to="/artist/signup"
                className="text-gray-300 hover:text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors hidden lg:block whitespace-nowrap"
              >
                For Artists
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-300 hover:bg-[#2a3c30] hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Toggle menu"
              >
                <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <UserMenu onLoginClick={() => setIsLoginModalOpen(true)} />
            </div>
          </div>
          {/* Mobile Search Bar */}
          <div className="sm:hidden pb-3">
            <SearchBar variant="header" />
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="lg:hidden bg-[#1A2B22] border-t border-white/10 relative z-50">
            <div className="container mx-auto px-4 py-4 space-y-1">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-gray-300 hover:text-white hover:bg-[#2a3c30] rounded-md transition-colors"
              >
                Home
              </Link>
              <Link
                to="/songs"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-gray-300 hover:text-white hover:bg-[#2a3c30] rounded-md transition-colors"
              >
                Browse Songs
              </Link>
              <Link
                to="/search"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-gray-300 hover:text-white hover:bg-[#2a3c30] rounded-md transition-colors"
              >
                Search
              </Link>
              <Link
                to="/community"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-gray-300 hover:text-white hover:bg-[#2a3c30] rounded-md transition-colors"
              >
                Community
              </Link>
              <Link
                to="/request-translation"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-gray-300 hover:text-white hover:bg-[#2a3c30] rounded-md transition-colors"
              >
                Request Translation
              </Link>
              <Link
                to="/artist/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] pl-4 py-3 text-green-400 hover:text-green-300 hover:bg-[#2a3c30] rounded-md transition-colors font-semibold"
              >
                For Artists
              </Link>
            </div>
          </div>
          </>
        )}
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
      <Notification notification={toast} onClose={() => setToast(null)} />
    </>
  );
};

export default Header;