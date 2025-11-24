import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const buttonColors = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-600/50 max-w-md w-full animate-scale-in">
        {/* Animated background */}
        <div className={`absolute inset-0 ${
          type === 'danger' ? 'bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5' :
          type === 'warning' ? 'bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5' :
          'bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5'
        } animate-gradient-shift rounded-2xl`}></div>
        
        <div className="relative z-10 p-6 md:p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`relative ${
              type === 'danger' ? 'text-red-400' :
              type === 'warning' ? 'text-yellow-400' :
              'text-blue-400'
            }`}>
              <div className={`absolute inset-0 ${
                type === 'danger' ? 'bg-red-500/20' :
                type === 'warning' ? 'bg-yellow-500/20' :
                'bg-blue-500/20'
              } rounded-full animate-ping`}></div>
              <div className={`relative bg-gray-700/50 p-4 rounded-full border ${
                type === 'danger' ? 'border-red-500/30' :
                type === 'warning' ? 'border-yellow-500/30' :
                'border-blue-500/30'
              }`}>
                {type === 'danger' ? (
                  <svg className="w-8 h-8 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : type === 'warning' ? (
                  <svg className="w-8 h-8 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 animate-scale-in" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-white text-center mb-3">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-300 text-center mb-6 leading-relaxed whitespace-pre-line">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 ${buttonColors[type]} text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

