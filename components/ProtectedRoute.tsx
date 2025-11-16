import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#122118]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to home with message
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#122118] px-4">
        <div className="max-w-md w-full bg-[#1a2922] rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/30">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-gray-400 mb-6">
            You need to be logged in to access this page.
          </p>
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Homepage & Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin - show access denied
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#122118] px-4">
        <div className="max-w-md w-full bg-[#1a2922] rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/30">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This area is restricted to administrators only.
          </p>
          <div className="space-y-3">
            <Link
              to="/"
              className="block w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Return to Homepage
            </Link>
            <div className="text-xs text-gray-500 pt-2">
              Logged in as: <span className="text-gray-400">{user.email}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

