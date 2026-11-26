import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import MediaImage from '../../components/MediaImage';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import AdminPagination from '../../components/admin/AdminPagination';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';

type AdminRole = 'user' | 'admin' | 'moderator' | 'artist' | 'arbiter';

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: AdminRole;
  createdAt: string;
  lastLoginAt: string | null;
}

const toQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  const query = search.toString();
  return query ? `?${query}` : '';
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
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
    case 'artist':
      return 'bg-green-600 text-white';
    case 'arbiter':
      return 'bg-purple-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
};

const UserAvatar: React.FC<{ user: AdminUser }> = ({ user }) => (
  <MediaImage
    src={user.photoUrl}
    alt="User avatar"
    className="h-12 w-12 rounded-full flex-shrink-0 object-cover"
    fallback={
      <span className="text-lg font-medium text-white">
        {user.displayName?.[0] || user.email?.[0] || 'U'}
      </span>
    }
    fallbackClassName="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"
  />
);

const UsersManager: React.FC = () => {
  const { authFetch } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm } = useConfirm();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'displayName' | 'email' | 'role' | 'lastLoginAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const itemsPerPage = 20;
  const requestSequence = useRef(0);

  const totalUsers = Object.values(roleCounts).reduce((sum, count) => sum + count, 0);

  const fetchData = useCallback(async (forceFresh = false) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const fresh = forceFresh ? { _ts: Date.now() } : {};
      const response = await authFetch('/api/admin/users' + toQuery({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery.trim() || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter.toUpperCase(),
        sortBy,
        sortOrder,
        ...fresh,
      }));
      if (sequence !== requestSequence.current) return;

      const usersData = Array.isArray(response?.data) ? response.data : [];
      setUsers(usersData.map((u: any) => ({
        id: u.id,
        email: u.email || '',
        displayName: u.displayName || '',
        photoUrl: u.photoUrl || '',
        role: (u.role || 'USER').toLowerCase() as AdminRole,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt || null,
      })));

      setFilteredTotal(Number(response?.total) || 0);
      setTotalPages(Math.max(1, Number(response?.totalPages) || 1));
      setRoleCounts(response?.roleCounts || {});
      const responseTotalPages = Math.max(1, Number(response?.totalPages) || 1);
      if (currentPage > responseTotalPages) {
        setCurrentPage(responseTotalPages);
        return;
      }
    } catch (error: any) {
      if (sequence !== requestSequence.current) return;
      showNotification({
        message: `Error loading users: ${error.message}`,
        type: 'error'
      });
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [authFetch, currentPage, itemsPerPage, roleFilter, searchQuery, showNotification, sortBy, sortOrder]);

  useEffect(() => {
    const delay = searchQuery.trim() ? 250 : 0;
    const timer = window.setTimeout(() => void fetchData(), delay);
    return () => window.clearTimeout(timer);
  }, [fetchData, searchQuery]);

  const handleRoleUpdate = async (user: AdminUser, newRole: AdminRole) => {
    if (newRole === user.role) return;

    if (newRole === 'admin') {
      const hasConfirmed = await confirm({
        title: 'Promote to Admin',
        message: `Promote "${user.displayName || user.email}" to Admin? They will have full access to the admin panel.`,
        confirmText: 'Promote',
        cancelText: 'Cancel',
        type: 'warning'
      });
      if (!hasConfirmed) return;
    }

    try {
      await authFetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole.toUpperCase() }),
      });
      showNotification({ message: 'User role updated successfully!', type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error updating user role: ${error.message}`, type: 'error' });
    }
  };

  const handleDemoteModerator = async (user: AdminUser) => {
    const hasConfirmed = await confirm({
      title: 'Remove Moderator Privileges',
      message: `Remove moderator privileges from "${user.displayName || user.email || 'Unknown'}"? They will be demoted to a regular user.`,
      confirmText: 'Demote',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch(`/api/admin/users/${user.id}/remove-moderator`, { method: 'POST' });
      showNotification({ message: 'Moderator privileges removed!', type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error demoting moderator: ${error.message}`, type: 'error' });
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    const hasConfirmed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.displayName || user.email}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!hasConfirmed) return;

    try {
      await authFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      showNotification({ message: 'User deleted successfully!', type: 'success' });
      void fetchData(true);
    } catch (error: any) {
      showNotification({ message: `Error deleting user: ${error.message}`, type: 'error' });
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const renderActions = (user: AdminUser) => (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <select
        value={user.role}
        onChange={(e) => void handleRoleUpdate(user, e.target.value as AdminRole)}
        aria-label={`Role for ${user.displayName || user.email}`}
        className="bg-gray-700 select-chevron px-3 pr-10 py-1.5 text-white text-sm rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="user">User</option>
        <option value="moderator">Moderator</option>
        <option value="artist">Artist</option>
        <option value="arbiter">Arbiter</option>
        <option value="admin">Admin</option>
      </select>

      {user.role === 'moderator' && (
        <button
          onClick={() => void handleDemoteModerator(user)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-1.5 px-3 rounded text-sm transition-colors"
          title="Remove moderator privileges"
        >
          Demote to User
        </button>
      )}

      <button
        onClick={() => void handleDeleteUser(user)}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded text-sm transition-colors"
      >
        Delete
      </button>
    </div>
  );

  if (loading) {
    return (
      <AdminListPageSkeleton rows={8} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Users Management</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Manage user accounts and roles</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Total Users</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalUsers}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Filtered Results</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{filteredTotal}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Admins</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{roleCounts.ADMIN || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 mb-1">Moderators</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{roleCounts.MODERATOR || 0}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name or email..."
                className="w-full px-4 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label htmlFor="user-role-filter" className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              id="user-role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'all' | AdminRole);
                setCurrentPage(1);
              }}
              className="w-full select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="artist">Artist</option>
              <option value="arbiter">Arbiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label htmlFor="user-sort-by" className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="flex gap-2">
              <select
                id="user-sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as typeof sortBy);
                  setCurrentPage(1);
                }}
                className="flex-1 select-chevron px-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="createdAt">Date Joined</option>
                <option value="displayName">Name</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="lastLoginAt">Last Login</option>
              </select>
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setCurrentPage(1);
                }}
                className="px-3 py-2.5 min-w-[44px] bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        {(searchQuery || roleFilter !== 'all') && (
          <button
            onClick={resetFilters}
            className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset Filters
          </button>
        )}
      </div>

      {/* Users List - Mobile Card View / Desktop Table View */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-6 sm:p-12 text-center">
            <div className="text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-lg font-semibold text-white mb-2">No Users Found</p>
              <p>Try adjusting your filters or search query</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">{user.displayName || 'Anonymous User'}</div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{formatDate(user.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{formatDate(user.lastLoginAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderActions(user)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-700">
              {users.map((user) => (
                <div key={user.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{user.displayName || 'Anonymous User'}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        <span>Joined: {formatDate(user.createdAt)}</span>
                        <span>Last login: {formatDate(user.lastLoginAt)}</span>
                      </div>
                    </div>
                  </div>
                  {renderActions(user)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTotal}
          itemsPerPage={itemsPerPage}
          itemLabel="users"
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Notification */}
      <Notification notification={notification} onClose={hideNotification} />

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          type={confirmState.options.type}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </div>
  );
};

export default UsersManager;
