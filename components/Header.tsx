import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import LogoIcon from './icons/LogoIcon';
import SearchBar from './SearchBar';
import UserMenu from './auth/UserMenu';
import LoginModal from './auth/LoginModal';
import Notification, { NotificationData } from './Notification';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/telemetryService';
import {
  notificationApi,
  type BackendNotification,
} from '../services/notificationService';
import type { AppNotification } from '../types';

const markNotificationAsRead = async (notificationId: string) => {
  try {
    await notificationApi.markRead(notificationId);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
};

let knownNotifIds = new Set<string>();
let notifSeeded = false;

const subscribeToUnreadNotifications = (
  _userId: string,
  onUpdate: (items: AppNotification[]) => void
) => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const poll = async () => {
    if (cancelled) return;
    try {
      const feed = await notificationApi.getFeed(1, 10);
      const items = feed.data.map((n) => notificationApi.mapToApp(n));

      // First poll seeds the "already seen" set so history is not toasted.
      if (!notifSeeded) {
        knownNotifIds = new Set(items.map((item) => item.id as string));
        notifSeeded = true;
        onUpdate([]);
        return;
      }

      const fresh = items.filter((item) => item.id && !knownNotifIds.has(item.id));
      if (fresh.length > 0) {
        knownNotifIds = new Set(items.map((item) => item.id as string));
        onUpdate(fresh);
      }
    } catch (err) {
      // Poll failures are transient; ignore and retry on the next interval.
    }
  };

  poll();
  timer = setInterval(poll, 15000);
  return () => {
    cancelled = true;
    if (timer) clearInterval(timer);
  };
};

const Header: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<NotificationData | null>(null);
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { user, loading } = useAuth();

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const { count } = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // ignore
    }
  }, [user?.uid]);

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
    if (!user?.uid) return;
    let seen = new Set<string>();
    const unsubscribe = subscribeToUnreadNotifications(user.uid, (items: AppNotification[]) => {
      const next = items.find((item) => item.id && !seen.has(item.id));
      if (!next || !next.id) return;
      seen.add(next.id);
      trackEvent('request_notification_received', { source: next.sourceCollection || 'backend' });
      setToast({ message: `${next.title}\n${next.message}`, type: 'info', duration: 6000 });
    });
    return () => unsubscribe();
  }, [user?.uid, loading]);

  useEffect(() => {
    if (loading) return;
    if (!user?.uid) {
      setUnreadCount(0);
      setIsNotifOpen(false);
      return;
    }
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.uid, loading, refreshUnreadCount]);

  useEffect(() => {
    if (!isNotifOpen || !user?.uid) return;
    let cancelled = false;
    notificationApi
      .getFeed(1, 20)
      .then((feed) => {
        if (!cancelled) setNotifications(feed.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isNotifOpen, user?.uid]);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await refreshUnreadCount();
  };

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

            {/* Right side: Search + Notifications + User */}
            <div className={`flex items-center justify-end space-x-1 sm:space-x-2 flex-1 min-w-0 ${isSearchOpen ? '' : ''}`}>
              <SearchBar
                variant="header"
                isOpen={isSearchOpen}
                onOpen={() => setIsSearchOpen(true)}
                onClose={() => setIsSearchOpen(false)}
              />
              {!isSearchOpen && user?.uid && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setIsNotifOpen((open) => !open)}
                    className="relative p-2 text-gray-300 hover:text-white transition-colors"
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-[#1A2B22] border border-white/10 rounded-lg shadow-xl z-50">
                      <div className="p-3 border-b border-white/10 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        <button
                          onClick={() => setIsNotifOpen(false)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-gray-400">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3 border-b border-white/5 ${n.read ? 'opacity-60' : ''}`}
                            >
                              <p className="text-sm font-medium text-white">{n.title}</p>
                              <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                              {!n.read && (
                                <button
                                  onClick={() => handleMarkRead(n.id)}
                                  className="mt-2 text-xs text-green-400 hover:text-green-300"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

export default Header;
