import React, { useEffect } from 'react';

export interface NotificationData {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface NotificationProps {
  notification: NotificationData | null;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const duration = notification.duration || (notification.type === 'success' ? 4000 : 5000);
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const iconColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400',
    warning: 'text-yellow-400'
  };

  const borderColors = {
    success: 'border-gray-600/50',
    error: 'border-red-500/50',
    info: 'border-blue-500/50',
    warning: 'border-yellow-500/50'
  };

  const bgGradients = {
    success: 'bg-gradient-to-r from-blue-500/10 via-green-500/10 to-blue-500/10',
    error: 'bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10',
    info: 'bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10',
    warning: 'bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10'
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const iconBgColors = {
    success: 'bg-green-500/20',
    error: 'bg-red-500/20',
    info: 'bg-blue-500/20',
    warning: 'bg-yellow-500/20'
  };

  const iconBorders = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
    warning: 'border-yellow-500/30'
  };

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 z-50 max-w-md mx-auto md:mx-0 animate-slide-in-right">
      <div className={`relative overflow-hidden rounded-2xl shadow-2xl border ${
        notification.type === 'error' 
          ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
          : 'bg-gradient-to-br from-gray-800 to-gray-900'
      } ${borderColors[notification.type]} backdrop-blur-sm`}>
        {/* Animated background gradient */}
        <div className={`absolute inset-0 ${bgGradients[notification.type]} animate-gradient-shift`}></div>
        
        {/* Content */}
        <div className="relative z-10 p-4 md:p-5">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex-shrink-0 relative ${iconColors[notification.type]}`}>
              <div className={`absolute inset-0 ${iconBgColors[notification.type]} rounded-full animate-ping`}></div>
              <div className={`relative bg-gray-700/50 p-2 rounded-full border ${iconBorders[notification.type]}`}>
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : notification.type === 'warning' ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
            
            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm md:text-base mb-1">
                {notification.type === 'success' ? 'Success!' : 
                 notification.type === 'error' ? 'Error' :
                 notification.type === 'warning' ? 'Warning' : 'Info'}
              </p>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                {notification.message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700/50"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-700/50 rounded-full overflow-hidden">
            <div 
              className={`h-full ${progressColors[notification.type]}`}
              style={{
                animation: `progress-bar ${notification.duration || (notification.type === 'success' ? 4000 : 5000)}ms linear forwards`
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;

