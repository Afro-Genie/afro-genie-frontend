import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface UserMenuProps {
  onLoginClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onLoginClick }) => {
  const { user, isAdmin } = useAuth();

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        {isAdmin && (
          <Link to="/admin" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
            Admin
          </Link>
        )}
        <div className="relative group">
          <button className="flex items-center space-x-2 text-gray-300 hover:text-white">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.displayName?.[0] || user.email?.[0] || 'U'}
                </span>
              </div>
            )}
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-sm text-white font-medium">{user.displayName || 'User'}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onLoginClick}
      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-full transition-colors"
    >
      Sign In
    </button>
  );
};

export default UserMenu;
