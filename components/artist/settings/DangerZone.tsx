import React, { useState } from 'react';
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react';

interface DangerZoneProps {
  onLogout: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

const DangerZone: React.FC<DangerZoneProps> = ({ onLogout, onDeleteAccount }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleteText !== 'DELETE' || !onDeleteAccount) return;
    setDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-red-900/30 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-red-900/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
        </div>
      </div>
      <div className="p-6 space-y-4">
        {/* Logout */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-white">Sign out</p>
            <p className="text-xs text-gray-500">Sign out of your account on this device</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="border-t border-red-900/20" />

        {/* Delete Account */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-red-400 font-medium">Delete Account</p>
            <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-700/50 hover:bg-red-900/50 text-red-300 hover:text-red-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-700/50 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Delete Account</h3>
              </div>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-300">
              This action is permanent and cannot be undone. All your songs, translations, analytics, and account data will be permanently deleted.
            </p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Type DELETE"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== 'DELETE' || deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DangerZone;
