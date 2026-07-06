import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../services/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token. Please request a new reset link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#122118] px-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successful</h2>
          <p className="text-gray-300 mb-6">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link
            to="/"
            className="inline-block min-h-[44px] leading-[44px] px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#122118] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">Enter your new password below</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-100 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {!token && (
            <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-100 px-4 py-3 rounded-lg mb-6">
              No reset token found. Please use the link from your reset email or{' '}
              <Link to="/forgot-password" className="text-yellow-300 underline">
                request a new one
              </Link>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Re-enter your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full min-h-[44px] bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/forgot-password" className="text-green-400 hover:text-green-300 text-sm">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
