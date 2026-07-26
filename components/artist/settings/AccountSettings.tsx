import React, { useState } from 'react';
import { Shield, Mail, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { authApi } from '../../../services/api';

interface AccountSettingsProps {
  email: string;
  isSpotifyLinked?: boolean;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ email, isSpotifyLinked }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async () => {
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to change password' });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-semibold text-white">Account</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">Manage your account security</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Email */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-white">Email</p>
              <p className="text-xs text-gray-400">{email || 'Not set'}</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">Contact support to change</span>
        </div>

        <div className="border-t border-gray-700/50" />

        {/* Change Password */}
        <div>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            <Shield className="w-4 h-4" />
            {showChangePassword ? 'Cancel' : 'Change Password'}
          </button>

          {showChangePassword && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Repeat new password"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changing || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {changing ? 'Changing...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700/50" />

        {/* Linked Accounts */}
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Linked Accounts</h3>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎵</span>
              <span className="text-sm text-white">Spotify</span>
            </div>
            {isSpotifyLinked ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-400">
                <CheckCircle className="w-3.5 h-3.5" />
                Linked
              </span>
            ) : (
              <span className="text-xs text-gray-500">Not linked</span>
            )}
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-900/30 border border-green-700/30 text-green-300'
                : 'bg-red-900/30 border border-red-700/30 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
