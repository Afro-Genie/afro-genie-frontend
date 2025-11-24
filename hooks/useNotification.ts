import { useState, useCallback } from 'react';
import type { NotificationData } from '../components/Notification';

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback((data: NotificationData) => {
    setNotification(data);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};

