import React from 'react';
import { AlertTriangle, Info, AlertOctagon } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ICON_CONFIG = {
  danger: {
    icon: AlertOctagon,
    iconBg: 'bg-red-500/10 text-red-400',
    buttonBg: 'bg-red-600 hover:bg-red-700'
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/10 text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700'
  },
  info: {
    icon: Info,
    iconBg: 'bg-green-500/10 text-green-400',
    buttonBg: 'bg-green-600 hover:bg-green-700'
  }
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  onConfirm,
  onCancel
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const config = ICON_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="text-sm text-gray-300 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`text-white font-semibold py-2.5 px-4 rounded-lg transition-colors ${config.buttonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
