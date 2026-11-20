import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LyricsBackfillPreview {
  youtubeLinked: number;
  populated: number;
  eligible: number;
  takedownExcluded: number;
  previewHash: string;
}

interface LyricsBackfillCounts {
  total?: number;
  completed?: number;
  providerHits?: number;
  providerMisses?: number;
  failed?: number;
  populated?: number;
  skipped?: number;
  remaining?: number;
  failures?: Array<{ songId: string; title: string; message: string }>;
}

interface LyricsBackfillJob {
  jobId: string;
  status: string;
  progress?: LyricsBackfillCounts & { stage?: string };
  result?: LyricsBackfillCounts | null;
  failedReason?: string | null;
}

interface LyricsBackfillHistoryEntry {
  jobId: string;
  type: string;
  status: string;
  attribution: 'admin' | 'scheduled';
  adminId: string | null;
  songId?: string | null;
  attemptsMade?: number;
  createdAt: string;
  result?: {
    enqueued?: number;
    providerHits?: number;
    providerMisses?: number;
    populated?: number;
    failed?: number;
  } | string | null;
  failedReason?: string | null;
}

const API_ROOT = '/api/admin/sync/lyrics-backfill';
const STORAGE_KEY = 'afro-genie-admin-lyrics-backfill-job';

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

const LyricsBackfillPanel: React.FC = () => {
  const { authFetch } = useAuth();
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const [preview, setPreview] = useState<LyricsBackfillPreview | null>(null);
  const [requestId, setRequestId] = useState(createRequestId);
  const [jobId, setJobId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [job, setJob] = useState<LyricsBackfillJob | null>(null);
  const [history, setHistory] = useState<LyricsBackfillHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const response = await authFetchRef.current(`${API_ROOT}/preview`) as LyricsBackfillPreview;
      if (!response || typeof response.previewHash !== 'string' || typeof response.eligible !== 'number') {
        throw new Error('The server returned an invalid lyrics backfill preview.');
      }
      setPreview(response);
      setRequestId(createRequestId());
      setConfirmed(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load lyrics coverage.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const response = await authFetchRef.current(`${API_ROOT}/history?limit=20`) as {
        jobs?: LyricsBackfillHistoryEntry[];
      };
      if (!Array.isArray(response?.jobs)) throw new Error('The server returned invalid lyrics backfill history.');
      setHistory(response.jobs);
      setHistoryError(null);
    } catch (requestError) {
      setHistoryError(requestError instanceof Error ? requestError.message : 'Could not load lyrics backfill history.');
    }
  };

  useEffect(() => {
    void refreshPreview();
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [job?.status, jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        setError('This browser could not clear the saved lyrics job reference.');
      }
      return undefined;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, jobId);
    } catch {
      setError('This browser could not save the lyrics job reference. Keep this page open to monitor it.');
    }

    let disposed = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await authFetchRef.current(`${API_ROOT}/${encodeURIComponent(jobId)}`) as LyricsBackfillJob;
        if (disposed) return;
        setJob(status);
        if (!isTerminal(status.status)) {
          timer = window.setTimeout(() => void poll(), 2500);
        }
      } catch (requestError) {
        if (disposed) return;
        setError(requestError instanceof Error ? requestError.message : 'Could not refresh lyrics job status.');
        timer = window.setTimeout(() => void poll(), 5000);
      }
    };

    void poll();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [jobId]);

  const startBackfill = async () => {
    if (!preview || !confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await authFetchRef.current(API_ROOT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, previewHash: preview.previewHash, requestId }),
      }) as { jobId?: string };
      if (!response?.jobId) throw new Error('The server did not return a lyrics backfill job ID.');
      setJob(null);
      setJobId(response.jobId);
      setConfirmed(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not queue lyrics backfill.');
    } finally {
      setSubmitting(false);
    }
  };

  const counts = job?.result || job?.progress || null;
  const active = Boolean(jobId && job && !isTerminal(job.status));

  return (
    <section aria-labelledby="lyrics-backfill-heading" className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="lyrics-backfill-heading" className="text-xl font-semibold text-white">YouTube lyrics backfill</h2>
          <p className="mt-1 text-sm text-gray-400">
            Preview songs that have a YouTube ID but no lyrics text. Existing lyrics and takedowns are preserved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshPreview()}
          disabled={loadingPreview || active}
          className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
        >
          {loadingPreview ? 'Refreshing…' : 'Refresh preview'}
        </button>
      </div>

      {preview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['YouTube-linked', preview.youtubeLinked],
            ['Lyrics populated', preview.populated],
            ['Eligible to backfill', preview.eligible],
            ['Takedowns excluded', preview.takedownExcluded],
          ].map(([label, count]) => (
            <div key={label} className="rounded-md border border-gray-700 bg-gray-900/50 p-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>
      )}

      {preview && preview.eligible > 0 && (
        <div className="space-y-3 rounded-md border border-amber-800/70 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-100">
            This will check up to {preview.eligible} eligible song(s) against LRCLIB. Results are matched against both title and artist.
            Provider misses stay eligible for a later run; lyrics are not assumed licensed.
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={active || submitting}
              className="mt-1"
            />
            <span>I reviewed the eligible count and want to run the lyrics backfill.</span>
          </label>
          <button
            type="button"
            onClick={() => void startBackfill()}
            disabled={!confirmed || submitting || active}
            className="min-h-[42px] rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Queueing backfill…' : active ? 'Backfill in progress…' : 'Run lyrics backfill'}
          </button>
        </div>
      )}

      {jobId && (
        <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-white">Backfill job</h3>
            <span role="status" className="rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-200">
              {job?.status || 'loading'}
            </span>
          </div>
          <p className="break-all text-xs text-gray-500">Job {jobId}</p>
          {counts && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Provider hits', counts.providerHits || 0],
                  ['Provider misses', counts.providerMisses || 0],
                  ['Job failures', counts.failed || 0],
                  ['Populated songs', counts.populated || 0],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-md border border-gray-700 p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-lg font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-300">
                Processed {counts.completed || 0} of {counts.total || 0}
                {counts.remaining !== undefined && ` · ${counts.remaining} songs still need lyrics`}
              </p>
              {!!counts.failures?.length && (
                <div role="alert" className="rounded border border-red-800 bg-red-950/30 p-3">
                  <h4 className="text-sm font-semibold text-red-200">Candidate failures</h4>
                  <ul className="mt-2 space-y-1 text-xs text-red-100">
                    {counts.failures.map((failure) => (
                      <li key={failure.songId}>{failure.title}: {failure.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {job?.status === 'failed' && job.failedReason && (
            <p role="alert" className="text-sm text-red-300">Backfill job failed: {job.failedReason}</p>
          )}
          {isTerminal(job?.status || '') && (
            <button
              type="button"
              onClick={() => {
                setJobId(null);
                void refreshPreview();
              }}
              className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              Close job report
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div>
          <h3 className="font-semibold text-white">Recent scheduled and admin backfills</h3>
          <p className="mt-1 text-xs text-gray-400">
            Admin backfills show who started them. Scheduled runs and their per-song retries are listed separately.
            To retry misses or failures, refresh the preview and explicitly start another run.
          </p>
        </div>
        {historyError && <p role="alert" className="text-sm text-red-300">{historyError}</p>}
        {history.length ? (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={`${entry.jobId}-${entry.type}`} className="rounded-md border border-gray-700 bg-gray-900/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-100">
                    {entry.type === 'admin-lyrics-backfill'
                      ? 'Admin batch'
                      : entry.type === 'backfill-lyrics'
                        ? 'Scheduled sweep'
                        : `Scheduled song ${entry.songId || ''}`}
                  </p>
                  <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">{entry.status}</span>
                </div>
                <p className="mt-1 break-all text-xs text-gray-400">
                  {entry.attribution === 'admin' ? `Started by admin ${entry.adminId}` : 'Started by scheduler'}
                  {' · '}{new Date(entry.createdAt).toLocaleString()}
                  {entry.attemptsMade !== undefined && ` · ${entry.attemptsMade} attempts`}
                </p>
                {entry.result && typeof entry.result === 'object' && (
                  <p className="mt-1 text-xs text-gray-300">
                    {entry.result.enqueued !== undefined
                      ? `${entry.result.enqueued} song jobs enqueued`
                      : `${entry.result.populated || 0} populated · ${entry.result.providerMisses || 0} misses · ${entry.result.failed || 0} failures`}
                  </p>
                )}
                {typeof entry.result === 'string' && (
                  <p className="mt-1 text-xs text-gray-300">Result: {entry.result}</p>
                )}
                {entry.failedReason && <p className="mt-1 text-xs text-red-300">{entry.failedReason}</p>}
              </li>
            ))}
          </ul>
        ) : !historyError ? (
          <p className="text-sm text-gray-500">No retained lyrics backfill jobs.</p>
        ) : null}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
};

export default LyricsBackfillPanel;
