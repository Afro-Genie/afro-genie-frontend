import React, { useEffect, useState, useCallback } from 'react';
import { moderationApi, NewUserItem, PaginatedResponse } from '../../services/moderationService';

const NewUsers: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<NewUserItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [welcomeModal, setWelcomeModal] = useState<{ userId: string; name: string } | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await moderationApi.getNewUsers({ days, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load new users:', err);
    } finally {
      setLoading(false);
    }
  }, [days, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSendWelcome = async () => {
    if (!welcomeModal || !welcomeMessage.trim()) return;
    setSending(true);
    try {
      await moderationApi.sendWelcomeMessage(welcomeModal.userId, welcomeMessage);
      setWelcomeModal(null);
      setWelcomeMessage('');
    } catch (err) {
      console.error('Failed to send welcome message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">New Users</h1>

      <div className="flex items-center space-x-4 mb-6">
        <span className="text-gray-400">Users joined in last:</span>
        <div className="flex space-x-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => { setDays(d); setPage(1); }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : !data?.data.length ? (
        <p className="text-gray-400 text-center py-12">No new users in this period.</p>
      ) : (
        <>
          <p className="text-gray-400 mb-4">Total: <span className="text-white font-bold">{data.pagination.total}</span> new users</p>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Joined</th>
                  <th className="text-left px-4 py-3">Activity</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white">{u.displayName || '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {u._count.translations + u._count.topics + u._count.topicComments} actions
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setWelcomeModal({ userId: u.id, name: u.displayName || u.email }); setWelcomeMessage(''); }}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded"
                      >
                        Welcome
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

      {welcomeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setWelcomeModal(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Send Welcome Message</h3>
            <p className="text-gray-400 mb-4">To: {welcomeModal.name}</p>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-32"
              placeholder="Write a welcome message..."
            />
            <div className="flex space-x-3">
              <button onClick={() => setWelcomeModal(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleSendWelcome} disabled={sending || !welcomeMessage.trim()} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50">
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewUsers;
