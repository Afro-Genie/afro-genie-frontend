import React, { useState, useEffect } from 'react';
import { adminRoleRequestsApi } from '../../services/api';
import type { RoleRequestWithUser, RoleRequestStatus, RequestedRole } from '../../services/api';

const RoleRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<RoleRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<'all' | RoleRequestStatus>('all');
  const [roleTab, setRoleTab] = useState<'all' | RequestedRole>('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRequests();
  }, [statusTab, roleTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (statusTab !== 'all') params.status = statusTab;
      if (roleTab !== 'all') params.role = roleTab;
      const result = await adminRoleRequestsApi.list(params as any);
      setRequests(result.data);
      setTotal(result.total);
    } catch (error) {
      console.error('Error fetching role requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await adminRoleRequestsApi.review(id, status, reviewNotes || undefined);
      setReviewingId(null);
      setReviewNotes('');
      fetchRequests();
    } catch (error) {
      console.error('Error reviewing request:', error);
    }
  };

  const getStatusBadge = (status: RoleRequestStatus) => {
    const styles: Record<RoleRequestStatus, string> = {
      PENDING: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
      UNDER_REVIEW: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
      APPROVED: 'bg-green-900/50 text-green-300 border-green-700/50',
      REJECTED: 'bg-red-900/50 text-red-300 border-red-700/50',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ARTIST: 'bg-purple-900/50 text-purple-300',
      MODERATOR: 'bg-blue-900/50 text-blue-300',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${styles[role] || 'bg-gray-700 text-gray-300'}`}>
        {role}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFields = (fields: Record<string, unknown>) => {
    return Object.entries(fields).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
        <span className="text-gray-300">{String(value)}</span>
      </div>
    ));
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Role Requests</h1>
        <p className="text-gray-400 mt-1">Review and approve user role upgrade requests</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              <button className={tabClass(statusTab === 'all')} onClick={() => setStatusTab('all')}>
                All
              </button>
              <button className={tabClass(statusTab === 'PENDING')} onClick={() => setStatusTab('PENDING')}>
                Pending
              </button>
              <button className={tabClass(statusTab === 'UNDER_REVIEW')} onClick={() => setStatusTab('UNDER_REVIEW')}>
                Under Review
              </button>
              <button className={tabClass(statusTab === 'APPROVED')} onClick={() => setStatusTab('APPROVED')}>
                Approved
              </button>
              <button className={tabClass(statusTab === 'REJECTED')} onClick={() => setStatusTab('REJECTED')}>
                Rejected
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Role</h3>
            <div className="flex flex-wrap gap-2">
              <button className={tabClass(roleTab === 'all')} onClick={() => setRoleTab('all')}>
                All Roles
              </button>
              <button className={tabClass(roleTab === 'ARTIST')} onClick={() => setRoleTab('ARTIST')}>
                Artist
              </button>
              <button className={tabClass(roleTab === 'MODERATOR')} onClick={() => setRoleTab('MODERATOR')}>
                Moderator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-gray-800 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {total} Request{total !== 1 ? 's' : ''}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No role requests found for the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {requests.map((req) => (
              <div key={req.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex-shrink-0">
                      {req.user.photoUrl ? (
                        <img
                          src={req.user.photoUrl}
                          alt="User avatar"
                          className="h-12 w-12 rounded-full"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center">
                          <span className="text-lg font-medium text-white">
                            {req.user.displayName?.[0] || req.user.email?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-medium text-white truncate">
                          {req.user.displayName || req.user.email}
                        </h3>
                        {getRoleBadge(req.role)}
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">{req.user.email}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Current role: {req.user.role} | Submitted: {formatDate(req.createdAt)}
                      </p>
                      <div className="mt-3 space-y-1">
                        {renderFields(req.fields as Record<string, unknown>)}
                      </div>
                      {req.notes && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Notes: </span>
                          <span className="text-gray-300">{req.notes}</span>
                        </div>
                      )}
                      {req.reviewedAt && (
                        <p className="text-gray-500 text-xs mt-2">
                          Reviewed: {formatDate(req.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {(req.status === 'PENDING' || req.status === 'UNDER_REVIEW') && (
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      {reviewingId === req.id ? (
                        <div className="space-y-3 bg-gray-700/50 p-4 rounded-lg">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Review notes (optional)"
                            rows={2}
                            className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(req.id, 'APPROVED')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(req.id, 'REJECTED')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => { setReviewingId(null); setReviewNotes(''); }}
                              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(req.id)}
                          className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleRequestsManager;
