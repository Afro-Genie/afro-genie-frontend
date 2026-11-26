import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ModSettings: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE' || !acknowledged) return;
    setDeleting(true);
    setMessage(null);
    try {
      const { apiRequest } = await import('../../services/api');
      await apiRequest('/users/me', { method: 'DELETE' });
      await logout();
      navigate('/');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to delete account.' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Moderator Settings</h1>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm max-w-2xl ${
          message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-2">Profile</h2>
          <p className="text-gray-400 mb-4">You are logged in as <strong className="text-white">{user?.email}</strong></p>
          <p className="text-gray-400">To update your profile settings, visit your <a href="/account" className="text-blue-400 hover:underline">Account Settings</a>.</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-2">Notification Preferences</h2>
          <p className="text-gray-400">Notification preferences for moderator actions will be available in a future update.</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-red-900/50">
          <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
          <p className="text-gray-400 mb-4">
            Deleting your account will remove your moderator access permanently. Your moderation action log entries will be anonymized but retained for audit purposes. This action cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                <p className="text-red-300 text-sm font-medium mb-2">Before you proceed:</p>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>You will lose all moderator access permanently</li>
                  <li>Your moderation action logs will be anonymized (kept for audit but no longer linked to you)</li>
                  <li>Any open reports assigned to you will be unassigned</li>
                  <li>Admins will be notified of your account deletion</li>
                  <li>Your profile, badges, and tokens will be permanently removed</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500"
                />
                <span className="text-sm text-gray-300">
                  I understand the consequences and wish to permanently delete my account
                </span>
              </label>

              <div>
                <p className="text-gray-300 mb-2">Type <strong className="text-red-400">DELETE</strong> to confirm:</p>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-3 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Type DELETE"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); setAcknowledged(false); }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteText !== 'DELETE' || !acknowledged}
                  className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModSettings;
