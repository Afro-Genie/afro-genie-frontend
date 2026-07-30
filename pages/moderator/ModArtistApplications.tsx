import React, { useEffect, useState, useCallback } from 'react';
import { moderationApi, ArtistApplicationItem, PaginatedResponse } from '../../services/moderationService';

type StatusTab = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

const ModArtistApplications: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<ArtistApplicationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusTab>('PENDING');
  const [page, setPage] = useState(1);
  const [recommendModal, setRecommendModal] = useState<{ id: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ArtistApplicationItem | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await moderationApi.getArtistApplications({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load artist applications:', err);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleRecommend = async () => {
    if (!recommendModal || !notes.trim()) return;
    setSaving(true);
    try {
      await moderationApi.recommendApplication(recommendModal.id, notes);
      setRecommendModal(null);
      setNotes('');
      fetch();
    } catch (err) {
      console.error('Failed to submit recommendation:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs: StatusTab[] = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Artist Applications</h1>

      <div className="flex space-x-2 mb-6 flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {tab.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : !data?.data.length ? (
        <p className="text-gray-400 text-center py-12">No applications found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Applicant</th>
                  <th className="text-left px-4 py-3">Stage Name</th>
                  <th className="text-left px-4 py-3">Genre</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="px-4 py-3 text-white">{app.user.displayName}</td>
                    <td className="px-4 py-3 text-gray-300">{app.stageName}</td>
                    <td className="px-4 py-3 text-gray-300">{app.genre}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        app.status === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                        app.status === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                        app.status === 'UNDER_REVIEW' ? 'bg-blue-900/50 text-blue-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>{app.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setRecommendModal({ id: app.id }); setNotes(''); }}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded"
                      >
                        Recommend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Previous</button>
              <span className="text-gray-400">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      {recommendModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRecommendModal(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Add Recommendation</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-32"
              placeholder="Write your recommendation notes for the admin..."
            />
            <div className="flex space-x-3">
              <button onClick={() => setRecommendModal(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleRecommend} disabled={saving || !notes.trim()} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedApp(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Application Details</h3>
            <dl className="space-y-3">
              <div><dt className="text-gray-400 text-sm">Applicant</dt><dd className="text-white">{selectedApp.user.displayName}</dd></div>
              <div><dt className="text-gray-400 text-sm">Email</dt><dd className="text-white">{selectedApp.user.email}</dd></div>
              <div><dt className="text-gray-400 text-sm">Stage Name</dt><dd className="text-white">{selectedApp.stageName}</dd></div>
              <div><dt className="text-gray-400 text-sm">Genre</dt><dd className="text-white">{selectedApp.genre}</dd></div>
              <div><dt className="text-gray-400 text-sm">Bio</dt><dd className="text-white text-sm">{selectedApp.bio}</dd></div>
              {selectedApp.recommendations.length > 0 && (
                <div><dt className="text-gray-400 text-sm">Recommendations</dt>
                  {selectedApp.recommendations.map((r) => (
                    <dd key={r.id} className="text-gray-300 text-sm mt-1 bg-gray-700 p-2 rounded">{r.notes}</dd>
                  ))}
                </div>
              )}
            </dl>
            <button onClick={() => setSelectedApp(null)} className="mt-6 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModArtistApplications;
