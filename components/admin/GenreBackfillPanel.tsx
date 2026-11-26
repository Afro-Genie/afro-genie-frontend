import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Scope = 'missing' | 'missed' | 'all';

interface GenreBackfillPreview {
  songsWithGenres: number;
  songsMissingGenres: number;
  artistsWithGenres: number;
  artistsMissingGenres: number;
  songsMissed: number;
  artistsMissed: number;
  songEligible: number;
  artistEligible: number;
  eligible: number;
  scope: Scope;
  previewHash: string;
}

interface MissedTarget {
  kind: 'song' | 'artist';
  id: string;
  label: string;
  secondaryLabel: string;
  missedAt: string | null;
}

interface GenreBackfillCounts {
  total?: number;
  completed?: number;
  providerHits?: number;
  providerMisses?: number;
  failed?: number;
  populated?: number;
  skipped?: number;
  remaining?: number;
  scope?: Scope;
  stage?: string;
  currentTarget?: string | null;
  failures?: Array<{ targetId: string; title: string; message: string }>;
}

interface GenreBackfillJob {
  jobId: string;
  status: string;
  scope?: Scope;
  progress?: GenreBackfillCounts;
  result?: GenreBackfillCounts | null;
  failedReason?: string | null;
}

interface GenreBackfillHistoryEntry {
  jobId: string;
  type: string;
  status: string;
  scope?: Scope | null;
  attribution: 'admin' | 'scheduled';
  adminId: string | null;
  songId?: string | null;
  artistId?: string | null;
  attemptsMade?: number;
  createdAt: string;
  result?: GenreBackfillCounts | string | null;
  failedReason?: string | null;
}

const API_ROOT = '/api/admin/sync/genre-backfill';
const STORAGE_KEY = 'afro-genie-admin-genre-backfill-job-v2';

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

const GenreBackfillPanel: React.FC<{ onCompleted?: () => void }> = ({ onCompleted }) => {
  const { authFetch } = useAuth();
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const [scope, setScope] = useState<Scope>('missing');
  const [preview, setPreview] = useState<GenreBackfillPreview | null>(null);
  const [requestId, setRequestId] = useState(createRequestId);
  const [jobId, setJobId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
  });
  const [job, setJob] = useState<GenreBackfillJob | null>(null);
  const [history, setHistory] = useState<GenreBackfillHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [missed, setMissed] = useState<MissedTarget[]>([]);
  const [missedLoading, setMissedLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPreview = async (nextScope: Scope = scope) => {
    setLoadingPreview(true);
    setError(null);
    try {
      const response = await authFetchRef.current(`${API_ROOT}/preview?scope=${nextScope}`) as GenreBackfillPreview;
      if (!response || typeof response.previewHash !== 'string') throw new Error('Invalid genre backfill preview.');
      setPreview(response);
      setRequestId(createRequestId());
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load genre coverage.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const refreshMissed = async () => {
    setMissedLoading(true);
    try {
      const response = await authFetchRef.current(`${API_ROOT}/missed?limit=20&page=1`) as { items?: MissedTarget[] };
      setMissed(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load missed genre candidates.');
    } finally {
      setMissedLoading(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const response = await authFetchRef.current(`${API_ROOT}/history?limit=20`) as { jobs?: GenreBackfillHistoryEntry[] };
      if (!Array.isArray(response?.jobs)) throw new Error('Invalid genre backfill history.');
      setHistory(response.jobs);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Could not load genre backfill history.');
    }
  };

  useEffect(() => { void refreshPreview(scope); }, [scope]);
  useEffect(() => { void refreshHistory(); }, [job?.status, jobId]);
  useEffect(() => { if (scope === 'missed') void refreshMissed(); }, [scope, job?.status]);
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
      return undefined;
    }
    try { sessionStorage.setItem(STORAGE_KEY, jobId); } catch {}
    let disposed = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await authFetchRef.current(`${API_ROOT}/${encodeURIComponent(jobId)}`) as GenreBackfillJob;
        if (disposed) return;
        setJob(status);
        if (isTerminal(status.status)) {
          onCompletedRef.current?.();
        } else {
          timer = window.setTimeout(() => void poll(), 2500);
        }
      } catch (err) {
        if (disposed) return;
        const message = err instanceof Error ? err.message : 'Could not refresh genre job status.';
        const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
        if (code === 'NOT_FOUND' || /not found/i.test(message)) {
          setJobId(null);
          setJob(null);
          return;
        }
        setError(message);
        timer = window.setTimeout(() => void poll(), 5000);
      }
    };
    void poll();
    return () => { disposed = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [jobId]);

  const startBackfill = async () => {
    if (!preview || !confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await authFetchRef.current(API_ROOT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, previewHash: preview.previewHash, requestId, scope }),
      }) as { jobId?: string };
      if (!response?.jobId) throw new Error('The server did not return a genre backfill job ID.');
      setJob(null);
      setJobId(response.jobId);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue genre backfill.');
    } finally {
      setSubmitting(false);
    }
  };

  const counts = job?.result || job?.progress || null;
  const active = Boolean(jobId && job && !isTerminal(job.status));

  return (
    <section aria-labelledby="genre-backfill-heading" className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="genre-backfill-heading" className="text-xl font-semibold text-white">MusicBrainz genre backfill</h2>
          <p className="mt-1 text-sm text-gray-400">Assign approved African genres to songs and artists. MusicBrainz is free, needs no API key, and is rate-limited to protect the service.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as Scope)}
            className="rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200"
          >
            <option value="missing">New / never-missed</option>
            <option value="missed">Previously missed</option>
            <option value="all">All active songs and artists</option>
          </select>
          <button
            type="button"
            onClick={() => void refreshPreview(scope)}
            disabled={loadingPreview || active}
            className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
          >
            {loadingPreview ? 'Refreshing...' : 'Refresh preview'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Songs with genres', preview.songsWithGenres],
            ['Songs missing genres', preview.songsMissingGenres],
            ['Artists with genres', preview.artistsWithGenres],
            ['Artists missing genres', preview.artistsMissingGenres],
            ['Previously missed', preview.songsMissed + preview.artistsMissed],
            ['Selected scope', preview.eligible],
          ].map(([label, count]) => (
            <div key={String(label)} className="rounded-md border border-gray-700 bg-gray-900/50 p-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="mt-1 text-xl font-bold text-white">{count}</p>
            </div>
          ))}
        </div>
      )}

      {preview && preview.eligible > 0 && (
        <div className="space-y-3 rounded-md border border-amber-800/70 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-100">
            This will check {preview.songEligible} song(s) and {preview.artistEligible} artist(s) against MusicBrainz. Misses are marked so they remain available for retry.
            {scope === 'all' && ' The all scope replaces provider-confirmed genre assignments.'}
          </p>
          <label className="flex items-start gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={active || submitting}
              className="mt-1"
            />
            <span>I reviewed the eligible count and want to run the {scope} genre backfill.</span>
          </label>
          <button
            type="button"
            onClick={() => void startBackfill()}
            disabled={!confirmed || submitting || active}
            className="min-h-[42px] rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Queueing backfill...' : active ? 'Backfill in progress...' : `Run ${scope} backfill`}
          </button>
        </div>
      )}

      {scope === 'missed' && (
        <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Previously missed candidates</h3>
            <button
              type="button"
              onClick={() => void refreshMissed()}
              disabled={missedLoading}
              className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50"
            >
              {missedLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs text-gray-400">These items were checked and MusicBrainz did not return an approved African genre. They stay in the missed scope for retry.</p>
          {missed.length ? (
            <ul className="space-y-2">
              {missed.map((target) => (
                <li key={`${target.kind}-${target.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-700 p-3">
                  <div>
                    <p className="font-medium text-gray-100">{target.label}</p>
                    <p className="text-xs text-gray-400">
                      {target.kind === 'song' ? `Song by ${target.secondaryLabel}` : 'Artist'} - missed {target.missedAt ? new Date(target.missedAt).toLocaleString() : 'unknown'}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">{target.kind}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">No missed genre candidates in this view.</p>}
        </div>
      )}

      {jobId && (
        <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-white">Backfill job</h3>
            <span role="status" className="rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-200">{job?.status || 'loading'}</span>
          </div>
          <p className="break-all text-xs text-gray-500">Job {jobId}{job?.scope ? ` - scope ${job.scope}` : ''}</p>
          {counts && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Provider hits', counts.providerHits || 0],
                  ['Provider misses', counts.providerMisses || 0],
                  ['Job failures', counts.failed || 0],
                  ['Genres assigned', counts.populated || 0],
                ].map(([label, count]) => (
                  <div key={String(label)} className="rounded-md border border-gray-700 p-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-lg font-bold text-white">{count}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-300">
                Processed {counts.completed || 0} of {counts.total || 0}
                {counts.remaining !== undefined && ` - ${counts.remaining} items still need genres in this scope`}
              </p>
              {active && counts.currentTarget && (
                <p className="truncate text-xs text-gray-400">Working on: {counts.currentTarget}</p>
              )}
              {!!counts.failures?.length && (
                <div role="alert" className="rounded border border-red-800 bg-red-950/30 p-3">
                  <h4 className="text-sm font-semibold text-red-200">Candidate failures</h4>
                  <ul className="mt-2 space-y-1 text-xs text-red-100">
                    {counts.failures.map((failure) => <li key={failure.targetId}>{failure.title}: {failure.message}</li>)}
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
              onClick={() => { setJobId(null); void refreshPreview(scope); void refreshMissed(); }}
              className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              Close job report
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div>
          <h3 className="font-semibold text-white">Recent scheduled and admin genre jobs</h3>
          <p className="mt-1 text-xs text-gray-400">Admin batches show scope. Automatic new-content enrichment appears as scheduled.</p>
        </div>
        {historyError && <p role="alert" className="text-sm text-red-300">{historyError}</p>}
        {history.length ? (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={`${entry.jobId}-${entry.createdAt}`} className="rounded-md border border-gray-700 bg-gray-900/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-100">
                    {entry.type === 'admin-genre-backfill'
                      ? `Admin batch (${entry.scope || 'missing'})`
                      : entry.type === 'genre-enrichment'
                        ? `Scheduled ${entry.songId ? 'song' : 'artist'} enrichment`
                        : entry.type}
                  </p>
                  <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">{entry.status}</span>
                </div>
                <p className="mt-1 break-all text-xs text-gray-400">
                  {entry.attribution === 'admin' ? `Started by admin ${entry.adminId}` : 'Started automatically'} - {new Date(entry.createdAt).toLocaleString()}
                  {entry.attemptsMade !== undefined && ` - ${entry.attemptsMade} attempts`}
                </p>
                {entry.result && typeof entry.result === 'object' && (
                  <p className="mt-1 text-xs text-gray-300">
                    {entry.result.populated !== undefined
                      ? `${entry.result.populated} assigned - ${entry.result.providerMisses || 0} misses - ${entry.result.failed || 0} failures`
                      : 'Completed'}
                  </p>
                )}
                {typeof entry.result === 'string' && <p className="mt-1 text-xs text-gray-300">Result: {entry.result}</p>}
                {entry.failedReason && <p className="mt-1 text-xs text-red-300">{entry.failedReason}</p>}
              </li>
            ))}
          </ul>
        ) : !historyError ? <p className="text-sm text-gray-500">No retained genre backfill jobs.</p> : null}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
};

export default GenreBackfillPanel;
