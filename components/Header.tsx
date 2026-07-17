import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from './icons/LogoIcon';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<NotificationData | null>(null);
  const { user, loading } = useAuth();

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
            {/* Logo - hidden when search is open */}
            {!isSearchOpen && (
              <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                <LogoIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                <span className="text-lg sm:text-xl font-bold text-white">AfroGenie</span>
              </Link>
            )}

            {/* Right side: Search + User */}
            <div className={`flex items-center justify-end space-x-1 sm:space-x-2 flex-1 min-w-0 ${isSearchOpen ? '' : ''}`}>
              <SearchBar
                variant="header"
                isOpen={isSearchOpen}
                onOpen={() => setIsSearchOpen(true)}
                onClose={() => setIsSearchOpen(false)}
              />
              {!isSearchOpen && (
                <UserMenu onLoginClick={() => setIsLoginModalOpen(true)} />
              )}
            </div>
          </div>
        </div>
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
