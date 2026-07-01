import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTranslationRequests, updateTranslationRequest, getSong } from '../../services/firebaseService';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import Notification from '../../components/Notification';
import ConfirmDialog from '../../components/ConfirmDialog';
import { AdminListPageSkeleton } from '../../components/PageSkeletons';
import type { TranslationRequest } from '../../types';

const TranslationRequestsPage: React.FC = () => {
  const { notification, showNotification, hideNotification } = useNotification();
  const { confirmState, confirm, closeConfirm } = useConfirm();
  
  const [requests, setRequests] = useState<TranslationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'rejected'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const allRequests = await getTranslationRequests();
      
      // Filter by status if not 'all'
      const filtered = statusFilter === 'all' 
        ? allRequests 
        : allRequests.filter(req => req.status === statusFilter);
      
      setRequests(filtered);
    } catch (error: any) {
      showNotification({
        message: `Error loading translation requests: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: TranslationRequest['status']) => {
    const hasConfirmed = await confirm({
      title: 'Update Request Status',
      message: `Are you sure you want to mark this request as ${newStatus}?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      type: 'info'
    });

    if (!hasConfirmed) return;

    setUpdatingId(requestId);
    try {
      await updateTranslationRequest(requestId, {
        status: newStatus
      });
      
      showNotification({
        message: 'Request status updated successfully!',
        type: 'success'
      });
      
      // Refresh requests
      await fetchRequests();
    } catch (error: any) {
      showNotification({
        message: `Error updating request: ${error.message}`,
        type: 'error'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: TranslationRequest['status']) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      completed: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
      'in-progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status || 'pending']}`}>
        {status || 'pending'}
      </span>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminListPageSkeleton rows={6} />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Translation Requests</h1>
          <p className="text-gray-400 mt-1">Manage and review translation requests from users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-gray-300 font-medium">Filter by status:</span>
          <div className="flex gap-2">
            {(['all', 'pending', 'in-progress', 'completed', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="ml-auto text-gray-400">
            Total: <span className="text-white font-semibold">{requests.length}</span>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No Translation Requests</h3>
          <p className="text-gray-400">
            {statusFilter === 'all' 
              ? 'There are no translation requests yet.'
              : `There are no ${statusFilter} translation requests.`}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Song
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {request.songTitle || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {request.artist || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {request.userEmail || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">
                        {formatDate(request.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request.id!, 'in-progress')}
                              disabled={updatingId === request.id}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                            >
                              {updatingId === request.id ? 'Updating...' : 'Start'}
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id!, 'completed')}
                              disabled={updatingId === request.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id!, 'rejected')}
                              disabled={updatingId === request.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'in-progress' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request.id!, 'completed')}
                              disabled={updatingId === request.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id!, 'rejected')}
                              disabled={updatingId === request.id}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.songId && (
                          <Link
                            to={`/songs/${request.songId}`}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded transition-colors"
                          >
                            View Song
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

export default TranslationRequestsPage;

