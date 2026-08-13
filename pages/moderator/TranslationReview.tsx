import React, { useEffect, useState, useCallback } from 'react';
import {
  moderationApi,
  TranslationItem,
  CorrectionItem,
  CorrectionRequestItem,
  TranslationRequestItem,
  PaginatedResponse,
} from '../../services/moderationService';

type Section = 'translations' | 'corrections' | 'requests' | 'translationRequests';
type StatusTab = 'PENDING' | 'APPROVED' | 'REJECTED';

// Asynchronous refresh: reload the current list every 15s so new items
// submitted from the playback screen / community appear without a manual refresh.
function useAsyncRefresh(callback: () => void, intervalMs = 15000) {
  useEffect(() => {
    const id = setInterval(callback, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs]);
}

const sections: { key: Section; label: string }[] = [
  { key: 'translations', label: 'Translations' },
  { key: 'corrections', label: 'Corrections' },
  { key: 'requests', label: 'Correction Requests' },
  { key: 'translationRequests', label: 'Translation Requests' },
];

const TranslationReview: React.FC = () => {
  const [section, setSection] = useState<Section>('translations');

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Translation Review and Corrections</h1>

      <div className="flex space-x-2 mb-6 flex-wrap gap-y-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === s.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'translations' && <TranslationsSection />}
      {section === 'corrections' && <CorrectionsSection />}
      {section === 'requests' && <CorrectionRequestsSection />}
      {section === 'translationRequests' && <TranslationRequestsSection />}
    </div>
  );
};

// ── Translations sub-section ────────────────────────────────────────────

const TranslationsSection: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<TranslationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusTab>('PENDING');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await moderationApi.getTranslations({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load translations:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useAsyncRefresh(() => fetch(true));

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.approveTranslation(id);
      fetch();
    } catch (err) {
      console.error('Failed to approve translation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await moderationApi.rejectTranslation(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      fetch();
    } catch (err) {
      console.error('Failed to reject translation:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: StatusTab[] = ['PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        <p className="text-gray-400 text-center py-12">No translations found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Song</th>
                  <th className="text-left px-4 py-3">Translator</th>
                  <th className="text-left px-4 py-3">Language</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <React.Fragment key={t.id}>
                    <tr
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    >
                      <td className="px-4 py-3 text-white">{t.song.title}</td>
                      <td className="px-4 py-3 text-gray-300">{t.user.displayName}</td>
                      <td className="px-4 py-3 text-gray-300">{t.sourceLang} → {t.targetLang}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          t.status === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                          t.status === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                          'bg-yellow-900/50 text-yellow-300'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        {t.status === 'PENDING' && (
                          <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleApprove(t.id)}
                              disabled={actionLoading === t.id}
                              className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectModal({ id: t.id }); setRejectReason(''); }}
                              disabled={actionLoading === t.id}
                              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-expanded`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-750">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-400 text-sm mb-2">Original ({t.sourceLang})</p>
                              <pre className="text-white text-sm whitespace-pre-wrap bg-gray-900 p-3 rounded max-h-60 overflow-y-auto">{t.originalLyrics}</pre>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm mb-2">Translation ({t.targetLang})</p>
                              <pre className="text-white text-sm whitespace-pre-wrap bg-gray-900 p-3 rounded max-h-60 overflow-y-auto">{t.translatedLyrics}</pre>
                            </div>
                          </div>
                          {t.culturalContext && (
                            <div className="mt-3">
                              <p className="text-gray-400 text-sm mb-1">Cultural Context</p>
                              <p className="text-gray-300 text-sm">{t.culturalContext}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setRejectModal(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Reject Translation</h3>
            <label className="block text-gray-400 text-sm mb-2">Reason (optional)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-24"
              placeholder="Provide a reason for rejection..."
            />
            <div className="flex space-x-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading === rejectModal.id} className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Corrections sub-section ─────────────────────────────────────────────

const CorrectionsSection: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CorrectionItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusTab>('PENDING');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await moderationApi.getCorrections({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useAsyncRefresh(() => fetch(true));

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.approveCorrection(id);
      fetch();
    } catch (err) {
      console.error('Failed to approve correction:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.rejectCorrection(id);
      fetch();
    } catch (err) {
      console.error('Failed to reject correction:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: StatusTab[] = ['PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        <p className="text-gray-400 text-center py-12">No corrections found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Song</th>
                  <th className="text-left px-4 py-3">Submitter</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <p className="text-white">{c.translation.song.title}</p>
                      <p className="text-sm text-gray-400">{c.translation.sourceLang} → {c.translation.targetLang}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.user.displayName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        c.status === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                        c.status === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'PENDING' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(c.id)}
                            disabled={actionLoading === c.id}
                            className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(c.id)}
                            disabled={actionLoading === c.id}
                            className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Reject
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Previous</button>
              <span className="text-gray-400">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Correction Requests sub-section ─────────────────────────────────────

const CorrectionRequestsSection: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CorrectionRequestItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusTab>('PENDING');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<CorrectionRequestItem | null>(null);
  const [correctedLyrics, setCorrectedLyrics] = useState('');
  const [moderatorNote, setModeratorNote] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await moderationApi.getCorrectionRequests({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load correction requests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useAsyncRefresh(() => fetch(true));

  const handleResolve = async () => {
    if (!resolveModal || !correctedLyrics.trim()) return;
    setActionLoading(resolveModal.id);
    try {
      await moderationApi.resolveCorrectionRequest(resolveModal.id, correctedLyrics.trim(), moderatorNote || undefined);
      setResolveModal(null);
      setCorrectedLyrics('');
      setModeratorNote('');
      fetch();
    } catch (err) {
      console.error('Failed to resolve correction request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.rejectCorrectionRequest(id);
      fetch();
    } catch (err) {
      console.error('Failed to reject correction request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: StatusTab[] = ['PENDING', 'APPROVED', 'REJECTED'];

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        <p className="text-gray-400 text-center py-12">No correction requests found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3">Song</th>
                  <th className="text-left px-4 py-3">Requester</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white max-w-[200px] truncate">{r.title}</td>
                    <td className="px-4 py-3 text-gray-300">{r.song.title}</td>
                    <td className="px-4 py-3 text-gray-300">{r.user.displayName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                        r.status === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => { setResolveModal(r); setCorrectedLyrics(''); setModeratorNote(''); }}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {r.resolvedBy && (
                        <span className="text-xs text-gray-500">by {r.resolvedBy.displayName}</span>
                      )}
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

      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setResolveModal(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-1">Resolve Correction Request</h3>
            <p className="text-gray-400 text-sm mb-4">Update the translation with corrected lyrics.</p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-400">Request from <span className="text-white font-medium">{resolveModal.user.displayName}</span></p>
              <p className="text-sm font-semibold text-white mt-2">{resolveModal.title}</p>
              <p className="text-sm text-gray-300 mt-1">{resolveModal.description}</p>
            </div>

            <label className="block text-gray-400 text-sm mb-1">Corrected Lyrics *</label>
            <textarea
              value={correctedLyrics}
              onChange={(e) => setCorrectedLyrics(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-40 font-mono text-sm"
              placeholder="Enter the corrected translation lyrics..."
            />

            <label className="block text-gray-400 text-sm mb-1">Moderator Note (optional)</label>
            <textarea
              value={moderatorNote}
              onChange={(e) => setModeratorNote(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-20 text-sm"
              placeholder="Any notes about the correction..."
            />

            <div className="flex space-x-3">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading === resolveModal.id || !correctedLyrics.trim()}
                className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded disabled:opacity-50"
              >
                {actionLoading === resolveModal.id ? 'Resolving...' : 'Resolve & Update Translation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Translation Requests sub-section ────────────────────────────────────

const TranslationRequestsSection: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<TranslationRequestItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<TranslationRequestItem | null>(null);
  const [translatedLyrics, setTranslatedLyrics] = useState('');
  const [moderatorNote, setModeratorNote] = useState('');

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await moderationApi.getTranslationRequests({ status, page, limit: 20 });
      setData(result);
    } catch (err) {
      console.error('Failed to load translation requests:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useAsyncRefresh(() => fetch(true));

  const handleResolve = async () => {
    if (!resolveModal || !translatedLyrics.trim()) return;
    setActionLoading(resolveModal.id);
    try {
      await moderationApi.resolveTranslationRequest(resolveModal.id, translatedLyrics.trim(), moderatorNote || undefined);
      setResolveModal(null);
      setTranslatedLyrics('');
      setModeratorNote('');
      fetch();
    } catch (err) {
      console.error('Failed to resolve translation request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await moderationApi.rejectTranslationRequest(id);
      fetch();
    } catch (err) {
      console.error('Failed to reject translation request:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const tabs: string[] = ['PENDING', 'COMPLETED', 'REJECTED'];

  const statusBadge = (s: string) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      s === 'APPROVED' || s === 'COMPLETED' ? 'bg-green-900/50 text-green-300' :
      s === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
      'bg-yellow-900/50 text-yellow-300'
    }`}>{s}</span>
  );

  return (
    <div>
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setStatus(tab); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              status === tab ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
        <p className="text-gray-400 text-center py-12">No translation requests found.</p>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-sm">
                  <th className="text-left px-4 py-3">Song</th>
                  <th className="text-left px-4 py-3">Requester</th>
                  <th className="text-left px-4 py-3">Language</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <p className="text-white">{r.song.title}</p>
                      <p className="text-sm text-gray-400">{r.song.artist?.name || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{r.user.displayName}</td>
                    <td className="px-4 py-3 text-gray-300">{r.sourceLang} → {r.targetLang}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => { setResolveModal(r); setTranslatedLyrics(''); setModeratorNote(''); }}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Review & Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded disabled:opacity-50"
                          >
                            Reject
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Previous</button>
              <span className="text-gray-400">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.pagination.totalPages} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setResolveModal(null)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-1">Review & Approve Translation</h3>
            <p className="text-gray-400 text-sm mb-4">Enter the corrected/complete translation, then approve so it becomes available to all users.</p>

            <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-1">
              <p className="text-sm text-white"><span className="text-gray-400">Song:</span> {resolveModal.song.title}</p>
              <p className="text-sm text-gray-300"><span className="text-gray-400">Requested by:</span> {resolveModal.user.displayName}</p>
              <p className="text-sm text-gray-300"><span className="text-gray-400">Language:</span> {resolveModal.sourceLang} → {resolveModal.targetLang}</p>
              {resolveModal.notes && <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{resolveModal.notes}</p>}
            </div>

            <label className="block text-gray-400 text-sm mb-1">Translation Lyrics *</label>
            <textarea
              value={translatedLyrics}
              onChange={(e) => setTranslatedLyrics(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-40 font-mono text-sm"
              placeholder="Enter the translation lyrics..."
            />

            <label className="block text-gray-400 text-sm mb-1">Moderator Note (optional)</label>
            <textarea
              value={moderatorNote}
              onChange={(e) => setModeratorNote(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4 h-20 text-sm"
              placeholder="Any notes about the translation..."
            />

            <div className="flex space-x-3">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading === resolveModal.id || !translatedLyrics.trim()}
                className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded disabled:opacity-50"
              >
                {actionLoading === resolveModal.id ? 'Approving...' : 'Approve & Publish to All Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationReview;
