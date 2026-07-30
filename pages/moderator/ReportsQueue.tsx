import React, { useEffect, useState, useCallback } from 'react';
import { moderationApi, ContentReport, PaginatedResponse } from '../../services/moderationService';

type StatusTab = 'PENDING' | 'RESOLVED' | 'DISMISSED';

const ReportsQueue: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<ContentReport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusTab>('PENDING');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const result = await moderationApi.getReports({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleResolve = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.resolveReport(id);
      fetchReports();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.dismissReport(id);
      fetchReports();
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: StatusTab[] = ['PENDING', 'RESOLVED', 'DISMISSED'];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Content Reports Queue</h1>

      <div className="flex space-x-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : !data?.data.length ? (
        <p className="text-gray-400 text-center py-12">No reports found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Reporter</th>
                  <th className="text-left px-4 py-3">Target</th>
                  <th className="text-left px-4 py-3">Reason</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-4 py-3 text-white">{report.reporter?.displayName || 'Anonymous'}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300">{report.targetType}</span>
                      <span className="text-gray-500 ml-1 text-sm">({report.targetId.slice(0, 8)}…)</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{report.reason}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {report.status === 'PENDING' && (
                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleResolve(report.id)}
                            disabled={actionLoading === report.id}
                            className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleDismiss(report.id)}
                            disabled={actionLoading === report.id}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-400">Page {page} of {data.pagination.totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedReport(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Report Details</h3>
            <dl className="space-y-3">
              <div><dt className="text-gray-400 text-sm">Reporter</dt><dd className="text-white">{selectedReport.reporter?.displayName || 'Anonymous'}</dd></div>
              <div><dt className="text-gray-400 text-sm">Target Type</dt><dd className="text-white">{selectedReport.targetType}</dd></div>
              <div><dt className="text-gray-400 text-sm">Target ID</dt><dd className="text-white text-sm break-all">{selectedReport.targetId}</dd></div>
              <div><dt className="text-gray-400 text-sm">Reason</dt><dd className="text-white">{selectedReport.reason}</dd></div>
              {selectedReport.description && <div><dt className="text-gray-400 text-sm">Description</dt><dd className="text-white">{selectedReport.description}</dd></div>}
              <div><dt className="text-gray-400 text-sm">Status</dt><dd className="text-white">{selectedReport.status}</dd></div>
              <div><dt className="text-gray-400 text-sm">Created</dt><dd className="text-white">{new Date(selectedReport.createdAt).toLocaleString()}</dd></div>
            </dl>
            <button onClick={() => setSelectedReport(null)} className="mt-6 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsQueue;
