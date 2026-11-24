import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Scope = 'new' | 'missed';

interface LyricsBackfillPreview {
  youtubeLinked: number;
  populated: number;
  eligible: number;
  takedownExcluded: number;
  newEligible: number;
  missedEligible: number;
  scope: Scope;
  previewHash: string;
}

interface MissedSong {
  id: string;
  title: string;
  artist: { name: string };
  lyricsBackfillMissedAt: string | null;
  youtubeVideoId?: string | null;
}

interface LyricsBackfillCounts {
  total?: number; completed?: number; providerHits?: number; providerMisses?: number; failed?: number; populated?: number; skipped?: number; remaining?: number; scope?: Scope;
  failures?: Array<{ songId: string; title: string; message: string }>;
}

interface LyricsBackfillJob {
  jobId: string; status: string; scope?: Scope; progress?: LyricsBackfillCounts & { stage?: string }; result?: LyricsBackfillCounts | null; failedReason?: string | null;
}

interface LyricsBackfillHistoryEntry {
  jobId: string; type: string; status: string; scope?: Scope; attribution: 'admin' | 'scheduled'; adminId: string | null; songId?: string | null; attemptsMade?: number; createdAt: string;
  result?: { enqueued?: number; providerHits?: number; providerMisses?: number; populated?: number; failed?: number } | string | null; failedReason?: string | null;
}

interface LyricLine { time: number; text: string; }

const API_ROOT = '/api/admin/sync/lyrics-backfill';
const STORAGE_KEY = 'afro-genie-admin-lyrics-backfill-job';

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
function isTerminal(status: string): boolean { return status === 'completed' || status === 'failed'; }
function parseLrc(text: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^\[(\d{1,3}):(\d{2})\.(\d{2,3})\]\s*(.*)$/);
    if (!m) continue;
    const ms = m[3].length === 2 ? Number(m[3]) * 10 : Number(m[3]);
    const time = Number(m[1]) * 60 + Number(m[2]) + ms / 1000;
    const t = m[4].trim();
    if (t) out.push({ time, text: t });
  }
  return out;
}
function linesToText(lines: LyricLine[]): string { return lines.map((l) => l.text).join('\n').trim(); }

const LyricsBackfillPanel: React.FC = () => {
  const { authFetch } = useAuth();
  const authFetchRef = useRef(authFetch); authFetchRef.current = authFetch;
  const [scope, setScope] = useState<Scope>('new');
  const [preview, setPreview] = useState<LyricsBackfillPreview | null>(null);
  const [requestId, setRequestId] = useState(createRequestId);
  const [jobId, setJobId] = useState<string | null>(() => { try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; } });
  const [job, setJob] = useState<LyricsBackfillJob | null>(null);
  const [history, setHistory] = useState<LyricsBackfillHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missed, setMissed] = useState<MissedSong[]>([]);
  const [missedLoading, setMissedLoading] = useState(false);
  const [editing, setEditing] = useState<MissedSong | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editLrc, setEditLrc] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  const refreshPreview = async (nextScope: Scope = scope) => {
    setLoadingPreview(true); setError(null);
    try {
      const response = await authFetchRef.current(`${API_ROOT}/preview?scope=${nextScope}`) as LyricsBackfillPreview;
      if (!response || typeof response.previewHash !== 'string') throw new Error('Invalid lyrics backfill preview.');
      setPreview(response); setRequestId(createRequestId()); setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load lyrics coverage.'); }
    finally { setLoadingPreview(false); }
  };
  const refreshMissed = async () => {
    setMissedLoading(true);
    try {
      const response = await authFetchRef.current(`${API_ROOT}/missed?limit=20&page=1`) as { items?: MissedSong[] };
      setMissed(Array.isArray(response?.items) ? response.items : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load missed songs.'); }
    finally { setMissedLoading(false); }
  };
  const refreshHistory = async () => {
    try {
      const response = await authFetchRef.current(`${API_ROOT}/history?limit=20`) as { jobs?: LyricsBackfillHistoryEntry[] };
      if (!Array.isArray(response?.jobs)) throw new Error('Invalid lyrics backfill history.');
      setHistory(response.jobs); setHistoryError(null);
    } catch (e) { setHistoryError(e instanceof Error ? e.message : 'Could not load lyrics backfill history.'); }
  };

  useEffect(() => { void refreshPreview(scope); }, [scope]);
  useEffect(() => { void refreshHistory(); }, [job?.status, jobId]);
  useEffect(() => { if (scope === 'missed') void refreshMissed(); }, [scope, job?.status]);
  useEffect(() => {
    if (!jobId) { setJob(null); try { sessionStorage.removeItem(STORAGE_KEY); } catch {} return undefined; }
    try { sessionStorage.setItem(STORAGE_KEY, jobId); } catch {}
    let disposed = false; let timer: number | undefined;
    const poll = async () => {
      try {
        const status = await authFetchRef.current(`${API_ROOT}/${encodeURIComponent(jobId)}`) as LyricsBackfillJob;
        if (disposed) return; setJob(status);
        if (!isTerminal(status.status)) timer = window.setTimeout(() => void poll(), 2500);
      } catch (e) { if (disposed) return; setError(e instanceof Error ? e.message : 'Could not refresh lyrics job status.'); timer = window.setTimeout(() => void poll(), 5000); }
    };
    void poll();
    return () => { disposed = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [jobId]);

  const startBackfill = async () => {
    if (!preview || !confirmed) return; setSubmitting(true); setError(null);
    try {
      const response = await authFetchRef.current(API_ROOT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, previewHash: preview.previewHash, requestId, scope }) }) as { jobId?: string };
      if (!response?.jobId) throw new Error('The server did not return a lyrics backfill job ID.');
      setJob(null); setJobId(response.jobId); setConfirmed(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not queue lyrics backfill.'); }
    finally { setSubmitting(false); }
  };
  const openManual = async (song: MissedSong) => {
    setEditing(song); setManualMsg(null); setEditContent(''); setEditLrc('');
    try { const existing = await authFetchRef.current(`/api/lyrics/${song.id}`) as any; if (existing?.content) setEditContent(existing.content); if (existing?.syncedLyrics) setEditLrc(existing.syncedLyrics); } catch {}
  };
  const saveManual = async () => {
    if (!editing) return;
    const content = editContent.trim() || linesToText(parseLrc(editLrc));
    if (!content) { setManualMsg('Provide plain lyrics or LRC with timestamps.'); return; }
    setSavingManual(true); setManualMsg(null);
    try {
      const parsed = editLrc.trim() ? parseLrc(editLrc) : undefined;
      await authFetchRef.current(`/api/admin/lyrics/${encodeURIComponent(editing.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, syncedLyrics: editLrc.trim() || null, lyricLines: parsed?.length ? parsed : undefined }) });
      setManualMsg('Lyrics saved and marked as populated.'); setEditing(null);
      await Promise.all([refreshMissed(), refreshPreview(scope), refreshHistory()]);
    } catch (e) { setManualMsg(e instanceof Error ? e.message : 'Failed to save lyrics.'); }
    finally { setSavingManual(false); }
  };

  const counts = job?.result || job?.progress || null;
  const active = Boolean(jobId && job && !isTerminal(job.status));

  return (
    <section aria-labelledby="lyrics-backfill-heading" className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="lyrics-backfill-heading" className="text-xl font-semibold text-white">YouTube lyrics backfill</h2>
          <p className="mt-1 text-sm text-gray-400">Backfill missing lyrics by scope. Provider misses are tracked separately so new songs are not blocked by previously ineligible songs.</p>
        </div>
        <div className="flex gap-2">
          <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200">
            <option value="new">New / never-missed</option>
            <option value="missed">Previously ineligible</option>
          </select>
          <button type="button" onClick={() => void refreshPreview(scope)} disabled={loadingPreview || active} className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50">{loadingPreview ? 'Refreshing...' : 'Refresh preview'}</button>
        </div>
      </div>

      {preview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[['YouTube-linked', preview.youtubeLinked], ['Lyrics populated', preview.populated], ['New eligible', preview.newEligible], ['Previously missed', preview.missedEligible], ['Selected scope', preview.eligible]].map(([label, count]) => (
            <div key={String(label)} className="rounded-md border border-gray-700 bg-gray-900/50 p-3"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-xl font-bold text-white">{count}</p></div>
          ))}
        </div>
      )}

      {preview && preview.eligible > 0 && (
        <div className="space-y-3 rounded-md border border-amber-800/70 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-100">This will check up to {preview.eligible} {scope === 'missed' ? 'previously missed' : 'new'} song(s) against LRCLIB. Misses are marked ineligible for later manual review.</p>
          <label className="flex items-start gap-2 text-sm text-gray-200"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={active || submitting} className="mt-1" /><span>I reviewed the eligible count and want to run the {scope} lyrics backfill.</span></label>
          <button type="button" onClick={() => void startBackfill()} disabled={!confirmed || submitting || active} className="min-h-[42px] rounded-md bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Queueing backfill...' : active ? 'Backfill in progress...' : `Run ${scope} backfill` }</button>
        </div>
      )}

      {scope === 'missed' && (
        <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/40 p-4">
          <div className="flex items-center justify-between"><h3 className="font-semibold text-white">Previously ineligible songs</h3><button type="button" onClick={() => void refreshMissed()} disabled={missedLoading} className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50">{missedLoading ? 'Loading...' : 'Refresh'}</button></div>
          <p className="text-xs text-gray-400">These songs were checked and no provider lyrics were found. You can manually add lyrics; saved lyrics follow the normal lyrics schema and sync timestamps when LRC is provided.</p>
          {missed.length ? <ul className="space-y-2">{missed.map((song) => (<li key={song.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-700 p-3"><div><p className="font-medium text-gray-100">{song.title}</p><p className="text-xs text-gray-400">{song.artist?.name} - missed {song.lyricsBackfillMissedAt ? new Date(song.lyricsBackfillMissedAt).toLocaleString() : 'unknown'}</p></div><button type="button" onClick={() => void openManual(song)} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Add lyrics manually</button></li>))}</ul> : <p className="text-sm text-gray-500">No missed songs in this view.</p>}
        </div>
      )}

      {editing && (
        <div className="space-y-3 rounded-md border border-blue-800 bg-blue-950/20 p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-white">Manual lyrics: {editing.title}</h3><button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-300 hover:text-white">Close</button></div>
          <p className="text-xs text-blue-100">Paste plain lyrics and/or LRC. If LRC is provided, timestamps are parsed into lyricLines for synced playback. Saving uses the normal lyrics save path.</p>
          <label className="block text-sm text-gray-200">Plain lyrics<textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={8} className="mt-1 w-full rounded-md border border-gray-600 bg-gray-900 p-2 text-sm text-white" placeholder="Line by line lyrics..." /></label>
          <label className="block text-sm text-gray-200">Synced LRC (optional)<textarea value={editLrc} onChange={(e) => setEditLrc(e.target.value)} rows={8} className="mt-1 w-full rounded-md border border-gray-600 bg-gray-900 p-2 font-mono text-xs text-white" placeholder="[00:12.34] First line" /></label>
          {editLrc.trim() && <p className="text-xs text-gray-300">Parsed {parseLrc(editLrc).length} synced line(s).</p>}
          <div className="flex gap-2"><button type="button" onClick={() => void saveManual()} disabled={savingManual} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{savingManual ? 'Saving...' : 'Save lyrics'}</button><button type="button" onClick={() => { setEditContent(linesToText(parseLrc(editLrc))); }} className="rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">Fill plain from LRC</button></div>
          {manualMsg && <p role="status" className="text-sm text-blue-100">{manualMsg}</p>}
        </div>
      )}

      {jobId && (
        <div className="space-y-3 rounded-md border border-gray-700 bg-gray-900/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-white">Backfill job</h3><span role="status" className="rounded-full bg-gray-700 px-3 py-1 text-sm text-gray-200">{job?.status || 'loading'}</span></div>
          <p className="break-all text-xs text-gray-500">Job {jobId}{job?.scope ? ` - scope ${job.scope}` : ''}</p>
          {counts && (<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Provider hits', counts.providerHits || 0], ['Provider misses', counts.providerMisses || 0], ['Job failures', counts.failed || 0], ['Populated songs', counts.populated || 0]].map(([label, count]) => (<div key={String(label)} className="rounded-md border border-gray-700 p-3"><p className="text-xs text-gray-400">{label}</p><p className="mt-1 text-lg font-bold text-white">{count}</p></div>))}</div><p className="text-sm text-gray-300">Processed {counts.completed || 0} of {counts.total || 0}{counts.remaining !== undefined && ` - ${counts.remaining} songs still need lyrics in this scope`}</p>{!!counts.failures?.length && <div role="alert" className="rounded border border-red-800 bg-red-950/30 p-3"><h4 className="text-sm font-semibold text-red-200">Candidate failures</h4><ul className="mt-2 space-y-1 text-xs text-red-100">{counts.failures.map((f) => <li key={f.songId}>{f.title}: {f.message}</li>)}</ul></div>}</>)}
          {job?.status === 'failed' && job.failedReason && <p role="alert" className="text-sm text-red-300">Backfill job failed: {job.failedReason}</p>}
          {isTerminal(job?.status || '') && <button type="button" onClick={() => { setJobId(null); void refreshPreview(scope); void refreshMissed(); }} className="min-h-[40px] rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700">Close job report</button>}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-700 pt-4">
        <div><h3 className="font-semibold text-white">Recent scheduled and admin backfills</h3><p className="mt-1 text-xs text-gray-400">Admin runs show scope. Misses remain in the missed scope for retry or manual population.</p></div>
        {historyError && <p role="alert" className="text-sm text-red-300">{historyError}</p>}
        {history.length ? <ul className="space-y-2">{history.map((entry) => (<li key={`${entry.jobId}-${entry.createdAt}`} className="rounded-md border border-gray-700 bg-gray-900/40 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-gray-100">{entry.type === 'admin-lyrics-backfill' ? `Admin batch (${entry.scope || "new"})` : entry.type === 'backfill-lyrics' ? 'Scheduled sweep' : 'Scheduled song' }</p><span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs text-gray-200">{entry.status}</span></div><p className="mt-1 break-all text-xs text-gray-400">{entry.attribution === 'admin' ? `Started by admin ${entry.adminId}` : 'Started by scheduler'} - {new Date(entry.createdAt).toLocaleString()}{entry.attemptsMade !== undefined && ` - ${entry.attemptsMade} attempts`}</p>{entry.result && typeof entry.result === 'object' && <p className="mt-1 text-xs text-gray-300">{entry.result.enqueued !== undefined ? `${entry.result.enqueued} song jobs enqueued` : `${entry.result.populated || 0} populated - ${entry.result.providerMisses || 0} misses - ${entry.result.failed || 0} failures`}</p>}{typeof entry.result === 'string' && <p className="mt-1 text-xs text-gray-300">Result: {entry.result}</p>}{entry.failedReason && <p className="mt-1 text-xs text-red-300">{entry.failedReason}</p>}</li>))}</ul> : !historyError ? <p className="text-sm text-gray-500">No retained lyrics backfill jobs.</p> : null}
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>
  );
};

export default LyricsBackfillPanel;










