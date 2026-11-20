import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type ImportSource = 'playlist' | 'artist' | 'genre' | 'song';
type JobOperation = 'preview' | 'resume' | 'apply';
type CandidateAction = 'create' | 'link' | 'skip';

interface JobReference {
  jobId: string;
  operation: JobOperation;
}

interface PersistedImportState {
  job: JobReference;
  previewJobId: string | null;
  quotaEstimate: QuotaEstimate | null;
}

interface QuotaEstimate {
  estimatedUnits: number;
  maxUnits: number;
  searchListCalls: number;
  playlistItemsListCalls: number;
  videosListCalls: number;
}

interface ImportCandidate {
  videoId: string;
  title: string;
  sourceTitle: string;
  artistName: string;
  channelId: string;
  genres: string[];
  imageUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  action: CandidateAction;
  reason: string | null;
  selected: boolean;
}

interface ImportPreview {
  previewHash: string;
  source: { type: string; value: string };
  complete: boolean;
  hasMore: boolean;
  discovery: {
    pagesRead: number;
    videosExamined: number;
    rejectedChannel: number;
    rejectedVideo: number;
    quotaEstimate: QuotaEstimate;
    unreviewedChannels: Array<{
      channelId: string;
      channelTitle: string;
      videos: number;
      sampleTitles: string[];
    }>;
  };
  summary: {
    candidates: number;
    toCreate: number;
    toLink: number;
    alreadyLinked: number;
    duplicatesSkipped: number;
    videoIdsAlreadyPresent: number;
    songsBefore: number;
    songsAfter: number;
  };
  page: number;
  pageSize: number;
  totalItems: number;
  items: ImportCandidate[];
}

interface JobProgress {
  stage?: string;
  pagesRead?: number;
  maxPages?: number;
  maxResults?: number;
  videosExamined?: number;
  eligibleCandidates?: number;
  current?: number;
  total?: number;
  created?: number;
  linked?: number;
  skipped?: number;
  failed?: number;
  completed?: number;
  quotaMessage?: string;
}

interface ApplyResult {
  created?: number;
  linked?: number;
  skipped?: number;
  failed?: number;
  completed?: number;
  total?: number;
  failures?: Array<{ videoId: string; title: string; message: string }>;
}

interface JobStatus {
  jobId: string;
  operation: JobOperation;
  status: string;
  progress?: JobProgress | number;
  failedReason?: string | null;
  preview?: ImportPreview;
  result?: ApplyResult;
  recovery?: 'missing-result' | 'job-unavailable';
}

interface QueueResponse {
  jobId: string;
  operation: JobOperation;
  status: string;
  quotaEstimate?: QuotaEstimate;
}

interface ImportSourceOptions {
  artists: Array<{ name: string; genres: string[] }>;
  genres: string[];
}

interface ImportHistoryJob {
  jobId: string;
  operation: JobOperation;
  status: string;
  source: { type: string; value: string } | null;
  previewJobId: string | null;
  createdAt: string;
  finishedAt: string | null;
}

const API_ROOT = '/api/admin/youtube-catalog/imports';
const PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 5000;
const PERSISTED_IMPORT_KEY = 'afro-genie-admin-youtube-import';

function readPersistedImportState(): PersistedImportState | null {
  try {
    const raw = sessionStorage.getItem(PERSISTED_IMPORT_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('job' in value) ||
      typeof value.job !== 'object' ||
      value.job === null ||
      !('jobId' in value.job) ||
      typeof value.job.jobId !== 'string' ||
      !('operation' in value.job) ||
      !['preview', 'resume', 'apply'].includes(String(value.job.operation))
    ) {
      sessionStorage.removeItem(PERSISTED_IMPORT_KEY);
      return null;
    }
    return value as PersistedImportState;
  } catch {
    sessionStorage.removeItem(PERSISTED_IMPORT_KEY);
    return null;
  }
}

const sourceOptions: { id: ImportSource; title: string; description: string }[] = [
  {
    id: 'playlist',
    title: 'YouTube playlist',
    description: 'Review songs from a YouTube playlist.',
  },
  {
    id: 'artist',
    title: 'African artist',
    description: 'Find songs from African artist channels in the configured catalog policy.',
  },
  {
    id: 'genre',
    title: 'African genre',
    description: 'Search only African genres with configured artist channels.',
  },
  {
    id: 'song',
    title: 'Song title',
    description: 'Look up specific African songs by name.',
  },
];

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

function isTerminal(status: string | undefined): boolean {
  return status === 'completed' || status === 'failed';
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

const ImportSongsPage: React.FC = () => {
  const { authFetch } = useAuth();
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const [persistedState] = useState(readPersistedImportState);

  const [source, setSource] = useState<ImportSource>('playlist');
  const [searchValue, setSearchValue] = useState('');
  const [requestId, setRequestId] = useState(createRequestId);
  const [step, setStep] = useState<'source' | 'monitor'>(persistedState ? 'monitor' : 'source');
  const [job, setJob] = useState<JobReference | null>(persistedState?.job ?? null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(persistedState?.previewJobId ?? null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [quotaEstimate, setQuotaEstimate] = useState<QuotaEstimate | null>(persistedState?.quotaEstimate ?? null);
  const [page, setPage] = useState(1);
  const [confirmApply, setConfirmApply] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [sourceOptionsData, setSourceOptionsData] = useState<ImportSourceOptions | null>(null);
  const [sourceOptionsError, setSourceOptionsError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImportHistoryJob[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [approvalDrafts, setApprovalDrafts] = useState<Record<string, {
    artistName: string;
    countryCode: string;
    genre: string;
  }>>({});
  const [recentJobsExpanded, setRecentJobsExpanded] = useState(false);

  const selectedSource = sourceOptions.find((option) => option.id === source)!;
  const sourceLabel = source === 'playlist' ? 'YouTube playlist URL' : selectedSource.title;
  const valuePlaceholder = source === 'playlist'
    ? 'https://www.youtube.com/playlist?list=...'
    : source === 'artist'
      ? 'e.g. Asake'
      : source === 'genre'
        ? 'e.g. Afrobeats'
        : 'e.g. song title';

  useEffect(() => {
    let disposed = false;
    void authFetchRef.current(`${API_ROOT}/sources`)
      .then((response: ImportSourceOptions) => {
        if (!disposed) {
          setSourceOptionsData(response);
          setSourceOptionsError(null);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setSourceOptionsError(error instanceof Error ? error.message : 'Could not load configured import sources.');
        }
      });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    void authFetchRef.current(`${API_ROOT}/history?limit=20`)
      .then((response: { jobs?: ImportHistoryJob[] }) => {
        if (!Array.isArray(response?.jobs)) {
          throw new Error('The server returned an invalid import history response.');
        }
        if (!disposed) {
          setRecentJobs(response.jobs);
          setHistoryError(null);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setHistoryError(error instanceof Error ? error.message : 'Could not load recent import jobs.');
        }
      });
    return () => {
      disposed = true;
    };
  }, [job?.jobId]);

  useEffect(() => {
    if (!job) return undefined;
    let disposed = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const status = await authFetchRef.current(
          `${API_ROOT}/${encodeURIComponent(job.jobId)}?page=${page}&pageSize=${PAGE_SIZE}`,
        ) as JobStatus;
        if (disposed) return;
        setJobStatus(status);
        setPollError(null);
        if (job.operation !== 'apply' && status.preview) {
          setPreview(status.preview);
          setPreviewJobId(job.jobId);
          setSelectedVideoIds((current) => current.size
            ? current
            : new Set(status.preview.items.filter((item) =>
                item.action !== 'skip' && item.selected !== false,
              ).map((item) => item.videoId)));
        }
        if (!isTerminal(status.status)) {
          timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : 'Could not refresh job status.';
        if (/not found|result is unavailable/i.test(message)) {
          const missingResult = /result is unavailable/i.test(message);
          setPollError(null);
          setJobStatus({
            jobId: job.jobId,
            operation: job.operation,
            status: 'failed',
            failedReason: message,
            progress: {
              stage: missingResult
                ? job.operation === 'apply' ? 'apply-result-missing' : 'preview-result-missing'
                : undefined,
            },
            recovery: missingResult ? 'missing-result' : 'job-unavailable',
          });
          return;
        }
        setPollError(message);
        timer = window.setTimeout(() => void poll(), POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [job?.jobId, job?.operation, page]);

  useEffect(() => {
    if (!job) {
      sessionStorage.removeItem(PERSISTED_IMPORT_KEY);
      setPersistenceError(null);
      return;
    }
    try {
      sessionStorage.setItem(PERSISTED_IMPORT_KEY, JSON.stringify({
        job,
        previewJobId,
        quotaEstimate,
      } satisfies PersistedImportState));
      setPersistenceError(null);
    } catch {
      setPersistenceError('This browser could not save the import monitor state. Keep this tab open to retain access to the job.');
    }
  }, [job, previewJobId, quotaEstimate]);

  useEffect(() => {
    if (!job || job.operation !== 'apply' || !previewJobId || preview) return;
    let disposed = false;
    void authFetchRef.current(
      `${API_ROOT}/${encodeURIComponent(previewJobId)}?page=${page}&pageSize=${PAGE_SIZE}`,
    ).then((status: JobStatus) => {
      if (!disposed && status.preview) setPreview(status.preview);
    }).catch((error: unknown) => {
      if (!disposed) {
        setPollError(error instanceof Error ? error.message : 'Could not restore the reviewed preview.');
      }
    });
    return () => {
      disposed = true;
    };
  }, [job?.jobId, job?.operation, page, preview, previewJobId]);

  const startPreview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchValue.trim();
    if (!value) return;

    setIsSubmitting(true);
    setActionError(null);
    setPollError(null);
    setJobStatus(null);
    setPreview(null);
    setPreviewJobId(null);
    setQuotaEstimate(null);
    setPage(1);
    setConfirmApply(false);
    setSelectedVideoIds(new Set());
    setSelectedVideoIds(new Set());

    const body = source === 'playlist'
      ? { playlistUrl: value, maxPages: 80, requestId }
      : { sourceType: source, query: value, maxResults: 50, requestId };

    try {
      const response = await authFetch(`${API_ROOT}/preview`, {
        method: 'POST',
        body: JSON.stringify(body),
      }) as QueueResponse;
      setJob({ jobId: response.jobId, operation: 'preview' });
      setPreviewJobId(response.jobId);
      setQuotaEstimate(response.quotaEstimate || null);
      setStep('monitor');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not queue the preview.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const runApply = async () => {
    if (!preview || !previewJobId || !confirmApply || selectedVideoIds.size === 0) return;
    setIsSubmitting(true);
    setActionError(null);
    setPollError(null);
    try {
      const response = await authFetch(
        `${API_ROOT}/${encodeURIComponent(previewJobId)}/apply`,
        {
          method: 'POST',
          body: JSON.stringify({
            confirm: true,
            previewHash: preview.previewHash,
            selectedVideoIds: [...selectedVideoIds],
          }),
        },
      ) as QueueResponse;
      setJob({ jobId: response.jobId, operation: 'apply' });
      setJobStatus(null);
      setConfirmApply(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not queue catalog changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resumePreview = async () => {
    if (!previewJobId) return;
    setIsSubmitting(true);
    setActionError(null);
    setPollError(null);
    try {
      const response = await authFetch(
        `${API_ROOT}/${encodeURIComponent(previewJobId)}/resume`,
        { method: 'POST', body: JSON.stringify({ maxPages: 80 }) },
      ) as QueueResponse;
      setJob({ jobId: response.jobId, operation: 'resume' });
      setQuotaEstimate(response.quotaEstimate || null);
      setPage(1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not resume playlist discovery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryJob = async () => {
    if (!job || !jobStatus) return;
    const candidateFailures = job.operation === 'apply'
      && jobStatus.status === 'completed'
      && (jobStatus.result?.failed || 0) > 0;
    if (jobStatus.status !== 'failed' && !candidateFailures) return;
    setIsSubmitting(true);
    setActionError(null);
    setPollError(null);
    try {
      const body = job.operation === 'apply' && preview
        ? {
            confirm: true,
            previewHash: preview.previewHash,
            selectedVideoIds: [...selectedVideoIds],
          }
        : undefined;
      const response = await authFetch(
        `${API_ROOT}/${encodeURIComponent(job.jobId)}/retry`,
        {
          method: 'POST',
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      ) as QueueResponse;
      setJob({ jobId: response.jobId, operation: response.operation });
      setJobStatus(null);
      if (response.operation === 'preview') setPreviewJobId(response.jobId);
      if (response.quotaEstimate) setQuotaEstimate(response.quotaEstimate);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not retry the job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnotherImport = () => {
    setStep('source');
    setJob(null);
    setJobStatus(null);
    setPreviewJobId(null);
    setPreview(null);
    setQuotaEstimate(null);
    setActionError(null);
    setPollError(null);
    setPage(1);
    setConfirmApply(false);
    setRequestId(createRequestId());
  };

  const progress = jobStatus?.progress && typeof jobStatus.progress === 'object'
    ? jobStatus.progress as JobProgress
    : null;
  const isQuotaFailure = jobStatus?.status === 'failed'
    && (progress?.stage === 'quota-paused' || /quota|dailyLimitExceeded/i.test(jobStatus.failedReason || ''));
  const discoveryTotal = progress?.pagesRead !== undefined
    ? progress.maxPages
    : progress?.videosExamined !== undefined ? progress.maxResults : undefined;
  const discoveryCurrent = progress?.pagesRead !== undefined
    ? progress.pagesRead
    : progress?.videosExamined;
  const discoveryProgressPercent = progress?.stage === 'preview-ready'
    ? 100
    : discoveryTotal && discoveryCurrent !== undefined
      ? Math.min(99, Math.round((discoveryCurrent / discoveryTotal) * 100))
      : null;
  const applyCounts: ApplyResult | null = job?.operation !== 'apply'
    ? null
    : jobStatus?.result
      || (progress
        ? {
          ...progress,
          failed: jobStatus?.status === 'failed' && jobStatus.recovery !== 'missing-result'
            ? Math.max(progress.failed || 0, 1)
            : progress.failed,
        }
        : jobStatus?.status === 'failed' ? { failed: 1 } : null);
  const unreviewedVideoCount = preview?.discovery.unreviewedChannels
    .reduce((total, channel) => total + channel.videos, 0) || 0;
  const totalPages = preview ? Math.max(1, Math.ceil(preview.totalItems / preview.pageSize)) : 1;
  const applyProgressPercent = applyCounts?.total
    ? Math.min(100, Math.round(((applyCounts.completed || 0) / applyCounts.total) * 100))
    : 0;

  const openHistoryJob = (historyJob: ImportHistoryJob) => {
    setStep('monitor');
    setJob({ jobId: historyJob.jobId, operation: historyJob.operation });
    setJobStatus(null);
    setPreviewJobId(historyJob.previewJobId);
    setPreview(null);
    setQuotaEstimate(null);
    setPage(1);
    setConfirmApply(false);
    setActionError(null);
    setPollError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          to="/admin/songs"
          className="mb-3 inline-flex min-h-[44px] items-center gap-2 text-gray-400 transition-colors hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Songs
        </Link>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Import Songs</h1>
        <p className="mt-1 text-sm text-gray-400 sm:text-base">
          Preview African-music candidates before applying catalog changes.
        </p>
      </div>

{step === 'source' ? (
    <>
    <section aria-labelledby="recent-imports-heading" className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 id="recent-imports-heading" className="text-lg font-semibold text-white">Recent import jobs</h2>
        <button
          type="button"
          onClick={() => setRecentJobsExpanded(prev => !prev)}
          className="text-sm text-gray-400 hover:text-white transition-colors"
          aria-label={recentJobsExpanded ? 'Collapse recent import jobs' : 'Expand recent import jobs'}
        >
          {recentJobsExpanded ? '▼' : '▲'}
        </button>
      </div>
      {recentJobsExpanded && (
        <div>
          {historyError && (
            <p role="alert" className="mt-3 text-sm text-amber-200">
              Could not load recent jobs: {historyError}
            </p>
          )}
          {recentJobs.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {recentJobs.map((historyJob) => (
                <li key={historyJob.jobId}>
                  <button
                    type="button"
                    onClick={() => openHistoryJob(historyJob)}
                    className="flex min-h-[44px] w-full flex-wrap items-center justify-between gap-2 rounded-md border border-gray-700 bg-gray-900/50 px-3 py-2 text-left hover:border-gray-500"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-white">
                        {historyJob.operation === 'apply' ? 'Apply' : 'Preview'} · {historyJob.source?.value || `Job ${historyJob.jobId}`}
                      </span>
                      <span className="block truncate text-xs text-gray-400">
                        {historyJob.jobId} · {formatDate(historyJob.createdAt) || 'Date unavailable'}
                      </span>
                    </span>
                    <span className="rounded-full bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-200">
                      {historyJob.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !historyError ? (
            <p className="mt-2 text-sm text-gray-400">No recent import jobs.</p>
          ) : null}
        </div>
      )}
    </section>
        <form onSubmit={startPreview} className="space-y-5 rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
          <fieldset>
            <legend className="mb-3 text-lg font-semibold text-white">Where should songs come from?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {sourceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={source === option.id}
                  onClick={() => {
                    setSource(option.id);
                    setRequestId(createRequestId());
                  }}
                  className={`min-h-[96px] rounded-lg border p-4 text-left transition-colors ${
                    source === option.id
                      ? 'border-green-500 bg-green-950/30'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <span className="block font-semibold text-white">{option.title}</span>
                  <span className="mt-1 block text-sm text-gray-400">{option.description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="import-source-value" className="mb-2 block text-sm font-medium text-gray-300">
              {sourceLabel}
            </label>
            <input
              id="import-source-value"
              type="text"
              required
              minLength={source === 'playlist' ? undefined : 2}
              value={searchValue}
              list={source === 'artist' ? 'african-import-artists' : source === 'genre' ? 'african-import-genres' : undefined}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setRequestId(createRequestId());
              }}
              placeholder={valuePlaceholder}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {source === 'artist' && sourceOptionsData && (
              <datalist id="african-import-artists">
                {sourceOptionsData.artists.map((artist) => <option key={artist.name} value={artist.name} />)}
              </datalist>
            )}
            {source === 'genre' && sourceOptionsData && (
              <datalist id="african-import-genres">
                {sourceOptionsData.genres.map((genre) => <option key={genre} value={genre} />)}
              </datalist>
            )}
            {source === 'genre' && sourceOptionsData && (
              <p className="mt-2 text-sm text-gray-400">
                Currently configured genres: {sourceOptionsData.genres.join(', ') || 'none'}.
                Other genres stay unavailable until African artist channels are configured.
              </p>
            )}
            {sourceOptionsError && (
              <p role="alert" className="mt-2 text-sm text-amber-200">
                Could not load the configured artist/genre list: {sourceOptionsError}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-green-800 bg-green-950/30 p-4 text-sm text-green-100">
            Discovery searches African-music content broadly. Known and previously approved artist channels are
            eligible for preview; unknown channels are shown for administrator approval and are never imported
            automatically. Use a supported African genre, review every candidate, and select only the songs or
            artists you want to apply.
          </div>

          {actionError && (
            <p role="alert" className="rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
              {actionError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/admin/songs/add"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-600 px-5 font-semibold text-gray-200 transition-colors hover:bg-gray-700"
            >
              Add one song manually
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] rounded-lg bg-green-600 px-5 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Queuing preview…' : 'Preview songs'}
            </button>
          </div>
        </form>
        </>
      ) : (
        <section aria-labelledby="job-heading" className="space-y-5">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="job-heading" className="text-lg font-semibold text-white">Import job</h2>
                <p className="mt-1 break-all text-sm text-gray-400">
                  {job?.operation === 'apply' ? 'Apply reviewed preview' : 'African-music preview'} · Job {job?.jobId || 'starting'}
                </p>
              </div>
              <span
                role="status"
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  jobStatus?.status === 'failed'
                    ? 'bg-red-900/70 text-red-200'
                    : jobStatus?.status === 'completed'
                      ? 'bg-green-900/70 text-green-200'
                      : 'bg-blue-900/70 text-blue-200'
                }`}
              >
                {jobStatus?.status || 'queued'}
              </span>
            </div>

            {quotaEstimate && (
              <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                <h3 className="font-semibold text-white">YouTube quota estimate</h3>
                <p className="mt-1 text-sm text-gray-300">
                  Up to {quotaEstimate.maxUnits} units ({quotaEstimate.estimatedUnits} estimated):
                  {' '}{quotaEstimate.searchListCalls} search, {quotaEstimate.playlistItemsListCalls} playlist,
                  {' '}{quotaEstimate.videosListCalls} video-detail API call(s).
                </p>
              </div>
            )}

            {job?.operation === 'apply' && applyCounts && (
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Created', applyCounts.created || 0],
                    ['Linked', applyCounts.linked || 0],
                    ['Skipped', applyCounts.skipped || 0],
                    ['Failed', applyCounts.failed || 0],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                      <p className="text-sm text-gray-400">{label}</p>
                      <p className="mt-1 text-xl font-bold text-white">{count}</p>
                    </div>
                  ))}
                </div>
                {applyCounts.total !== undefined && (
                  <div>
                    <div className="mb-1 flex justify-between text-sm text-gray-300">
                      <span>Processed {applyCounts.completed || 0} of {applyCounts.total}</span>
                      <span>{applyProgressPercent}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Apply progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={applyProgressPercent}
                      className="h-2 overflow-hidden rounded bg-gray-700"
                    >
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${applyProgressPercent}%` }} />
                    </div>
                  </div>
                )}
                {!!applyCounts.failures?.length && (
                  <div role="alert" className="rounded-lg border border-red-700/70 bg-red-950/30 p-4">
                    <h3 className="font-semibold text-red-100">Candidate failures ({applyCounts.failures.length})</h3>
                    <ul className="mt-2 space-y-2 text-sm text-red-100/90">
                      {applyCounts.failures.map((failure) => (
                        <li key={failure.videoId}>
                          <span className="font-medium">{failure.title}</span> ({failure.videoId}): {failure.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {job?.operation !== 'apply' && progress && (
              <p className="mt-4 text-sm text-gray-300" aria-live="polite">
                {progress.stage === 'quota-paused'
                  ? `YouTube quota reached${progress.pagesRead ? ` after ${progress.pagesRead} playlist page(s)` : ''}.`
                  : progress.stage === 'preview-result-missing'
                    ? 'The preview result was not saved. Rebuild the preview from its original source.'
                  : progress.stage === 'preview-ready'
                    ? 'Preview is ready for review.'
                    : progress.pagesRead !== undefined && progress.maxPages !== undefined
                      ? `Read ${progress.pagesRead} of ${progress.maxPages || 80} playlist pages; ${progress.videosExamined || 0} videos examined.`
                      : progress.videosExamined !== undefined
                        ? `Examined ${progress.videosExamined} YouTube result(s); ${progress.eligibleCandidates || 0} African-music candidate(s) passed policy.`
                      : jobStatus?.status === 'waiting' || jobStatus?.status === 'delayed'
                        ? 'Waiting for an import worker to start discovery…'
                      : 'Discovering and checking African-music candidates…'}
              </p>
            )}

            {job?.operation !== 'apply' && jobStatus?.status !== 'failed' && (
              <div className="mt-4" aria-live="polite">
                <div className="mb-1 flex justify-between text-sm text-gray-300">
                  <span>
                    {progress?.pagesRead !== undefined
                      ? 'Playlist discovery'
                      : progress?.videosExamined !== undefined ? 'Search result review' : 'Preparing discovery'}
                  </span>
                  {discoveryProgressPercent !== null && <span>{discoveryProgressPercent}%</span>}
                </div>
                <div
                  role="progressbar"
                  aria-label="Preview discovery progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={discoveryProgressPercent ?? undefined}
                  aria-valuetext={discoveryProgressPercent === null
                    ? 'Discovery is in progress'
                    : `${discoveryProgressPercent}% complete`}
                  className="h-2 overflow-hidden rounded bg-gray-700"
                >
                  <div
                    className={`h-full bg-blue-500 transition-all ${discoveryProgressPercent === null ? 'w-1/3 animate-pulse' : ''}`}
                    style={discoveryProgressPercent === null ? undefined : { width: `${discoveryProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {pollError && (
              <p role="alert" className="mt-4 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">
                Could not refresh job status: {pollError}. The monitor will retry automatically.
              </p>
            )}
            {persistenceError && (
              <p role="alert" className="mt-4 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">
                {persistenceError}
              </p>
            )}

            {jobStatus?.status === 'failed' && (
              <div role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-4 text-sm text-red-100">
                <p className="font-semibold">
                  {jobStatus.recovery === 'missing-result'
                    ? 'Import result could not be restored'
                    : jobStatus.recovery === 'job-unavailable'
                      ? 'Import job is no longer available'
                      : isQuotaFailure ? 'YouTube quota limit reached' : 'Import job failed'}
                </p>
                <p className="mt-1">{jobStatus.failedReason || progress?.quotaMessage || 'The job failed without a detailed error.'}</p>
                <p className="mt-2">
                  {jobStatus.recovery === 'missing-result'
                    ? job?.operation === 'apply'
                      ? 'The apply result was lost after processing. Retry the confirmed apply; the operation is idempotent.'
                      : 'Retry to rebuild the preview from the original source. No catalog changes are made by a preview.'
                    : jobStatus.recovery === 'job-unavailable'
                      ? 'The job is no longer retained by the server. Start a new import to continue.'
                    : isQuotaFailure
                    ? `Wait for the YouTube quota to reset, then retry. Preview jobs do not write to the catalog; ${job?.operation === 'resume' ? 'the retry continues from the last completed playlist preview.' : 'a discovery retry starts from the original source.'}`
                    : 'Review the error, then retry when the underlying issue is resolved. Apply retries are safe and will not replace existing YouTube IDs.'}
                </p>
              </div>
            )}

            {actionError && (
              <p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
                {actionError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {((jobStatus?.status === 'failed' && jobStatus.recovery !== 'job-unavailable') || (job?.operation === 'apply' && (jobStatus?.result?.failed || 0) > 0)) && (
                <button
                  type="button"
                  disabled={isSubmitting || (job?.operation === 'apply' && !preview)}
                  onClick={() => void retryJob()}
                  className="min-h-[44px] rounded-lg bg-amber-600 px-5 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Queuing retry…'
                    : jobStatus?.recovery === 'missing-result'
                      ? job?.operation === 'apply' ? 'Retry apply safely' : 'Rebuild preview'
                      : job?.operation === 'apply' && jobStatus?.status === 'completed' ? 'Retry failed candidates' : 'Retry failed job'}
                </button>
              )}
              {preview && !preview.complete && jobStatus?.status === 'completed' && preview.source.type === 'playlist' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void resumePreview()}
                  className="min-h-[44px] rounded-lg bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Queuing resume…' : 'Resume playlist discovery'}
                </button>
              )}
              {isTerminal(jobStatus?.status) && (
                <button
                  type="button"
                  onClick={startAnotherImport}
                  className="min-h-[44px] rounded-lg border border-gray-600 px-5 font-semibold text-gray-200 hover:bg-gray-700"
                >
                  Start another import
                </button>
              )}
            </div>
          </div>

          {preview && (
            <>
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Preview summary</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {preview.complete
                        ? 'Discovery is complete. Review every page before applying.'
                        : 'This playlist preview is incomplete; resume discovery before applying.'}
                    </p>
                  </div>
                  {preview.discovery.quotaEstimate && (
                    <p className="rounded bg-gray-900 px-3 py-2 text-sm text-gray-200">
                      Discovery used an estimated {preview.discovery.quotaEstimate.estimatedUnits} quota units.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Candidates', preview.summary.candidates],
                    ['Projected creates', preview.summary.toCreate],
                    ['Projected links', preview.summary.toLink],
                    ['Items for review', unreviewedVideoCount],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                      <p className="text-sm text-gray-400">{label}</p>
                      <p className="mt-1 text-xl font-bold text-white">{count}</p>
                    </div>
                  ))}
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  <div><dt className="inline text-gray-400">Songs before: </dt><dd className="inline text-white">{preview.summary.songsBefore}</dd></div>
                  <div><dt className="inline text-gray-400">Projected after: </dt><dd className="inline text-white">{preview.summary.songsAfter}</dd></div>
                  <div><dt className="inline text-gray-400">Skipped as duplicates/already linked: </dt><dd className="inline text-white">{preview.summary.duplicatesSkipped + preview.summary.alreadyLinked}</dd></div>
                </dl>

                {preview.discovery.unreviewedChannels.length > 0 && (
                  <div className="mt-5 rounded-lg border border-amber-700/60 bg-amber-950/30 p-4">
                    <h3 className="font-semibold text-amber-100">
                      Excluded channels for review ({preview.discovery.unreviewedChannels.length} channels, {unreviewedVideoCount} videos)
                    </h3>
                    <p className="mt-1 text-sm text-amber-100/80">These channels are not imported because they are not in the configured African artist/channel policy.</p>
                    <ul className="mt-3 space-y-2 text-sm text-amber-50">
                      {preview.discovery.unreviewedChannels.slice(0, 10).map((channel) => (
                        <li key={channel.channelId}>
                          <span className="font-medium">{channel.channelTitle}</span> — {channel.videos} video(s)
                          <span className="ml-1 text-amber-100/70">({channel.channelId})</span>
                          {channel.sampleTitles.length > 0 && (
                            <span className="block text-amber-100/70">Examples: {channel.sampleTitles.join('; ')}</span>
                          )}
                          <div className="mt-2 grid gap-2 sm:grid-cols-4">
                            <input
                              aria-label={`Approved artist name for ${channel.channelTitle}`}
                              value={approvalDrafts[channel.channelId]?.artistName ?? channel.channelTitle}
                              onChange={(event) => setApprovalDrafts((current) => ({
                                ...current,
                                [channel.channelId]: {
                                  artistName: event.target.value,
                                  countryCode: current[channel.channelId]?.countryCode ?? 'NG',
                                  genre: current[channel.channelId]?.genre ?? 'Afrobeats',
                                },
                              }))}
                              className="rounded border border-amber-700/60 bg-gray-950 px-2 py-1.5 text-white"
                            />
                            <input
                              aria-label={`Country code for ${channel.channelTitle}`}
                              maxLength={2}
                              value={approvalDrafts[channel.channelId]?.countryCode ?? 'NG'}
                              onChange={(event) => setApprovalDrafts((current) => ({
                                ...current,
                                [channel.channelId]: {
                                  artistName: current[channel.channelId]?.artistName ?? channel.channelTitle,
                                  countryCode: event.target.value.toUpperCase(),
                                  genre: current[channel.channelId]?.genre ?? 'Afrobeats',
                                },
                              }))}
                              className="rounded border border-amber-700/60 bg-gray-950 px-2 py-1.5 text-white"
                            />
                            <input
                              aria-label={`African genre for ${channel.channelTitle}`}
                              value={approvalDrafts[channel.channelId]?.genre ?? 'Afrobeats'}
                              onChange={(event) => setApprovalDrafts((current) => ({
                                ...current,
                                [channel.channelId]: {
                                  artistName: current[channel.channelId]?.artistName ?? channel.channelTitle,
                                  countryCode: current[channel.channelId]?.countryCode ?? 'NG',
                                  genre: event.target.value,
                                },
                              }))}
                              className="rounded border border-amber-700/60 bg-gray-950 px-2 py-1.5 text-white"
                            />
<button
                              type="button"
                              disabled={isSubmitting}
onClick={async () => {
                                const draft = approvalDrafts[channel.channelId];
                                const artistName = draft?.artistName.trim() || channel.channelTitle;
                                const countryCode = (draft?.countryCode.trim() || 'NG').toUpperCase();
                                const genre = draft?.genre.trim() || 'Afrobeats';
                                setIsSubmitting(true);
                                setActionError(null);
                                try {
                                  await authFetch('/api/admin/youtube-catalog/imports/channels/approve', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      channelId: channel.channelId,
                                      artistName,
                                      countryCode,
                                      genres: [genre],
                                    }),
                                  });
setActionError(null);
                                // Refresh the preview by re-polling the job status
                                // and resetting preview state to force a fresh fetch
                                try {
                                  void poll();
                                  setPreview(null);
                                  setPreviewJobId(null);
                                } catch (pollError) {
                                  // Poll failure is non-critical; approval still persisted to DB
                                  console.error('Poll failed after approval:', pollError);
                                }
                                } catch (error) {
                                  setActionError(error instanceof Error ? error.message : 'Could not approve song.');
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                              className="rounded bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                              Approve song
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {preview.discovery.unreviewedChannels.length > 10 && (
                      <p className="mt-2 text-sm text-amber-100/80">Showing 10 of {preview.discovery.unreviewedChannels.length} excluded channels.</p>
                    )}
                  </div>
                )}

                <div className="mt-5 border-t border-gray-700 pt-5">
                  <h3 className="font-semibold text-white">Review candidates</h3>
                  {preview.items.some((candidate) => candidate.action !== 'skip') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmApply(false);
                          setSelectedVideoIds(new Set(
                            preview.items
                              .filter((candidate) => candidate.action !== 'skip')
                              .map((candidate) => candidate.videoId),
                          ));
                        }}
                        className="min-h-[36px] rounded border border-green-700 px-3 text-sm text-green-200 hover:bg-green-950/40"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmApply(false);
                          setSelectedVideoIds(new Set());
                        }}
                        className="min-h-[36px] rounded border border-gray-600 px-3 text-sm text-gray-200 hover:bg-gray-700"
                      >
                        Deselect all
                      </button>
                      <span className="self-center text-sm text-gray-400">
                        {selectedVideoIds.size} selected
                      </span>
                    </div>
                  )}
                  <div className="mt-3 space-y-3">
                    {preview.items.map((candidate) => (
                      <article key={candidate.videoId} className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                        <div className="flex gap-3">
                          {candidate.action !== 'skip' && (
                            <input
                              type="checkbox"
                              checked={selectedVideoIds.has(candidate.videoId)}
                              onChange={(event) => {
                                setConfirmApply(false);
                                setSelectedVideoIds((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(candidate.videoId);
                                  else next.delete(candidate.videoId);
                                  return next;
                                });
                              }}
                              className="mt-1 h-4 w-4 shrink-0 accent-green-500"
                              aria-label={`Select ${candidate.title} by ${candidate.artistName}`}
                            />
                          )}
                          {candidate.imageUrl && (
                            <img
                              src={candidate.imageUrl}
                              alt=""
                              loading="lazy"
                              className="h-16 w-16 shrink-0 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h4 className="font-semibold text-white">{candidate.title}</h4>
                              <span className={`rounded px-2 py-1 text-xs font-bold uppercase ${
                                candidate.action === 'create'
                                  ? 'bg-green-900/70 text-green-200'
                                  : candidate.action === 'link'
                                    ? 'bg-blue-900/70 text-blue-200'
                                    : 'bg-gray-700 text-gray-200'
                              }`}>
                                {candidate.action === 'create' ? 'New song' : candidate.action === 'link' ? 'Link existing' : 'Skipped'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-300">
                              {candidate.artistName} · {candidate.genres.length ? candidate.genres.join(', ') : 'Genre not classified'}
                            </p>
                            <p className="mt-1 break-all text-xs text-gray-500">
                              Channel {candidate.channelId} · Video {candidate.videoId}
                            </p>
                            {(formatDuration(candidate.durationSeconds) || formatDate(candidate.publishedAt)) && (
                              <p className="mt-1 text-xs text-gray-500">
                                {[formatDuration(candidate.durationSeconds), formatDate(candidate.publishedAt)].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            <p className="mt-2 text-sm text-gray-300">
                              {candidate.reason || 'Eligible African-music candidate from a configured artist channel.'}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                    {preview.items.length === 0 && (
                      <p className="rounded-lg border border-gray-700 p-4 text-sm text-gray-400">
                        No eligible candidates were found on this page.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-400">
                      Showing {preview.totalItems === 0 ? 0 : (preview.page - 1) * preview.pageSize + 1}–
                      {Math.min(preview.page * preview.pageSize, preview.totalItems)} of {preview.totalItems}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || job?.operation === 'apply'}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="min-h-[40px] rounded border border-gray-600 px-3 text-sm text-white disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <span className="self-center text-sm text-gray-300">Page {preview.page} of {totalPages}</span>
                      <button
                        type="button"
                        disabled={page >= totalPages || job?.operation === 'apply'}
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        className="min-h-[40px] rounded border border-gray-600 px-3 text-sm text-white disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {preview.complete && job?.operation !== 'apply' && (
                <div className="space-y-4 rounded-lg border border-green-800 bg-green-950/20 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-white">Apply reviewed preview</h2>
                  <label className="flex items-start gap-3 text-sm text-gray-200">
                    <input
                      type="checkbox"
                      checked={confirmApply}
                      onChange={(event) => setConfirmApply(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-green-500"
                    />
                    <span>
                      I reviewed the candidate selections and confirm applying {selectedVideoIds.size} selected
                      candidate(s). Existing song data and YouTube IDs will be preserved.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!confirmApply || selectedVideoIds.size === 0 || isSubmitting || jobStatus?.status !== 'completed'}
                    onClick={() => void runApply()}
                    className="min-h-[44px] rounded-lg bg-green-600 px-5 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Queuing apply…' : 'Apply reviewed songs'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default ImportSongsPage;
