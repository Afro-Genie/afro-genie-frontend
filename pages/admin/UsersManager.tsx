import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole, deleteUser } from '../../services/firebaseService';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';
import type { UserProfile } from '../../services/firebaseService';

const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleTab, setRoleTab] = useState<'all' | 'admin' | 'user' | 'contributors' | 'artist'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin' | 'moderator' | 'artist') => {
    try {
      await updateUserRole(userId, newRole);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        fetchUsers(); // Refresh the list
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600 text-white';
      case 'moderator':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleTab === 'all') return true;
    if (roleTab === 'contributors') return u.role === 'moderator' || u.role === 'artist';
    return u.role === roleTab;
  });

  const tabClass = (tab: typeof roleTab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      roleTab === tab ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  if (loading) {
    return (
      <AdminListPageSkeleton rows={6} />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Users Management</h1>
          <p className="text-gray-400 mt-1">Manage user accounts and roles</p>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-wrap gap-2 mb-4">
            <button className={tabClass('all')} onClick={() => setRoleTab('all')}>All</button>
            <button className={tabClass('admin')} onClick={() => setRoleTab('admin')}>Admin</button>
            <button className={tabClass('user')} onClick={() => setRoleTab('user')}>Users</button>
            <button className={tabClass('contributors')} onClick={() => setRoleTab('contributors')}>Contributors</button>
            <button className={tabClass('artist')} onClick={() => setRoleTab('artist')}>Artists</button>
          </div>
          <h2 className="text-xl font-semibold text-white">
            {roleTab === 'all' ? 'All Users' : `Users: ${roleTab}`} ({filteredUsers.length})
          </h2>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No users found for this role.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="User avatar"
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-lg font-medium text-white">
                          {user.displayName?.[0] || user.email?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-white truncate">
                        {user.displayName || 'Anonymous User'}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                      <span>Joined: {formatDate(user.createdAt)}</span>
                      <span>Last login: {formatDate(user.lastLogin)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Role Selector */}
                  <select
                    value={user.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'user' | 'admin' | 'moderator' | 'artist';
                      if (newRole === 'admin' && !window.confirm('Promote this user to Admin?')) return;
                      handleRoleUpdate(user.uid, newRole);
                    }}
                    className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="artist">Artist</option>
                    <option value="admin">Admin</option>
                  </select>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteUser(user.uid)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManager;

