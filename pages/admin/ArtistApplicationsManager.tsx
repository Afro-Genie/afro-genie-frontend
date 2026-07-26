import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { CancelIcon } from '../../components/icons/FlatIcons';

interface Application {
  id: string;
  stageName: string;
  email: string;
  genre: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
}

type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
  UNDER_REVIEW: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  APPROVED: 'bg-green-900/50 text-green-300 border-green-700/50',
  REJECTED: 'bg-red-900/50 text-red-300 border-red-700/50',
};

const PAGE_SIZE = 10;

const ArtistApplicationsManager: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const data = await apiRequest<{ data: Application[]; total: number } | Application[]>(
        `/admin/artist-applications${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`
      );
      if (Array.isArray(data)) {
        setApplications(data);
        setTotal(data.length);
      } else {
        setApplications(data.data ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const paginatedApplications = applications.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );
  const totalPages = Math.ceil(applications.length / PAGE_SIZE);

  const handleApprove = async (id: string) => {
    try {
      await apiRequest(`/admin/artist-applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      fetchApplications();
    } catch (error) {
      console.error('Error approving application:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiRequest(`/admin/artist-applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason: rejectReason || undefined,
        }),
      });
      setRejectingId(null);
      setRejectReason('');
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Artist Applications</h1>
        <p className="text-gray-400 mt-1">Review and manage artist applications</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={tabClass(statusFilter === status)}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : paginatedApplications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No applications found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Genre
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{app.stageName}</div>
                      <div className="text-xs text-gray-400">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{app.genre}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                          statusStyles[app.status] || statusStyles.PENDING
                        }`}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(app.status === 'PENDING' || app.status === 'UNDER_REVIEW') && (
                        <div className="flex items-center justify-end gap-2">
                          {rejectingId === app.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason (optional)"
                                className="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 w-48"
                              />
                              <button
                                onClick={() => handleReject(app.id)}
                                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                className="p-1.5 text-gray-400 hover:text-white"
                              >
                                <CancelIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
                                className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingId(app.id)}
                                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistApplicationsManager;
