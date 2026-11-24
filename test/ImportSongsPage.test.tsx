import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportSongsPage from '../pages/admin/ImportSongsPage';

const { mockAuthFetch } = vi.hoisted(() => ({ mockAuthFetch: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

const PERSISTED_KEY = 'afro-genie-admin-youtube-import';
const APPROVE_URL = '/api/admin/youtube-catalog/imports/channels/approve';

const preview = {
  previewHash: 'a'.repeat(64),
  source: { type: 'artist-search', value: 'Asake' },
  complete: true,
  hasMore: false,
  discovery: {
    pagesRead: 0,
    videosExamined: 1,
    rejectedChannel: 0,
    rejectedVideo: 0,
    quotaEstimate: {
      estimatedUnits: 101,
      maxUnits: 101,
      searchListCalls: 1,
      playlistItemsListCalls: 0,
      videosListCalls: 1,
    },
    unreviewedChannels: [],
  },
  summary: {
    candidates: 1,
    toCreate: 1,
    toLink: 0,
    alreadyLinked: 0,
    duplicatesSkipped: 0,
    videoIdsAlreadyPresent: 0,
    songsBefore: 10,
    songsAfter: 11,
  },
  page: 1,
  pageSize: 50,
  totalItems: 1,
  items: [{
    videoId: 'video-123',
    title: 'African Song',
    sourceTitle: 'African Song official video',
    artistName: 'Asake',
    channelId: 'channel-123',
    genres: ['Afrobeats'],
    imageUrl: null,
    durationSeconds: 198,
    publishedAt: '2024-01-01T00:00:00.000Z',
    action: 'create',
    reason: 'Create a new song for a configured African artist.',
  }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ImportSongsPage />
    </MemoryRouter>,
  );
}

function expandRecentJobs() {
  fireEvent.click(screen.getByRole('button', { name: 'Expand recent import jobs' }));
}

function selectApplyConfirmation() {
  fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the candidate selections/ }));
}

function persistJob(job: { jobId: string; operation: string }, previewJobId: string | null = null) {
  sessionStorage.setItem(PERSISTED_KEY, JSON.stringify({
    job,
    previewJobId,
    quotaEstimate: null,
  }));
}

describe('ImportSongsPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    sessionStorage.clear();
  });

  it('previews candidates, requires confirmation, and displays apply results', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'preview-job', operation: 'preview', status: 'queued', quotaEstimate: preview.discovery.quotaEstimate };
      }
      if (url.includes('/preview-job?')) {
        return { jobId: 'preview-job', operation: 'preview', status: 'completed', progress: { stage: 'preview-ready' }, preview };
      }
      if (url.endsWith('/preview-job/apply')) {
        return { jobId: 'apply-job', operation: 'apply', status: 'queued' };
      }
      if (url.includes('/apply-job?')) {
        return {
          jobId: 'apply-job',
          operation: 'apply',
          status: 'completed',
          result: { created: 1, linked: 0, skipped: 0, failed: 0, completed: 1, total: 1 },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /African artist/i }));
    fireEvent.change(screen.getByLabelText('African artist'), { target: { value: 'Asake' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(screen.getByText('Create a new song for a configured African artist.')).toBeTruthy();
    expect(screen.getByText(/Up to 101 units/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apply reviewed songs' })).toHaveProperty('disabled', true);

    const previewRequest = mockAuthFetch.mock.calls.find(([url, options]) => url.endsWith('/preview') && options?.method === 'POST');
    expect(JSON.parse(previewRequest[1].body as string)).toMatchObject({
      sourceType: 'artist',
      query: 'Asake',
    });
    expect(JSON.parse(previewRequest[1].body as string).requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    selectApplyConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed songs' }));

    expect(await screen.findByText('Created')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Processed 1 of 1')).toBeTruthy();
    });
    expect(sessionStorage.getItem('afro-genie:admin:songs:refresh')).toBe('1');
    const applyRequest = mockAuthFetch.mock.calls.find(([url, options]) => url.endsWith('/preview-job/apply') && options?.method === 'POST');
    expect(JSON.parse(applyRequest[1].body as string)).toEqual({
      confirm: true,
      previewHash: preview.previewHash,
      selectedVideoIds: ['video-123'],
    });
  });

  it('shows quota failures and offers an explicit retry', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'failed-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/failed-preview?')) {
        return {
          jobId: 'failed-preview',
          operation: 'preview',
          status: 'failed',
          progress: { stage: 'quota-paused', pagesRead: 3 },
          failedReason: 'YouTube quota exceeded',
        };
      }
      if (url.endsWith('/failed-preview/retry')) {
        return { jobId: 'retried-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/retried-preview?')) {
        return { jobId: 'retried-preview', operation: 'preview', status: 'completed', preview };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=african-list' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByText('YouTube quota limit reached')).toBeTruthy();
    expect(screen.getByText(/Wait for the YouTube quota to reset/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed job' }));
    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/admin/youtube-catalog/imports/failed-preview/retry',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows measured progress while playlist candidates are being discovered', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'progress-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/progress-preview?')) {
        return {
          jobId: 'progress-preview',
          operation: 'preview',
          status: 'active',
          progress: {
            stage: 'discovering',
            pagesRead: 2,
            maxPages: 8,
            videosExamined: 20,
            eligibleCandidates: 5,
          },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=african-list' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByText(/Read 2 of 8 playlist pages; 20 videos examined/)).toBeTruthy();
    const progressbar = screen.getByRole('progressbar', { name: 'Preview discovery progress' });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('25');
  });

  it('stops polling and offers preview recovery when a completed result is missing', async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) {
        return {
          jobs: [{
            jobId: 'missing-preview',
            operation: 'preview',
            status: 'completed',
            source: { type: 'playlist', value: 'african-list' },
            previewJobId: 'missing-preview',
            createdAt: '2025-01-01T00:00:00.000Z',
            finishedAt: '2025-01-01T00:01:00.000Z',
          }],
        };
      }
      if (url.includes('/missing-preview?')) throw new Error('Preview result is unavailable');
      if (url.endsWith('/missing-preview/retry')) {
        return { jobId: 'rebuilt-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/rebuilt-preview?')) {
        return { jobId: 'rebuilt-preview', operation: 'preview', status: 'completed', preview };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    expandRecentJobs();
    fireEvent.click(await screen.findByRole('button', { name: /african-list/ }));

    expect(await screen.findByText('Import result could not be restored')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild preview' }));
    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/admin/youtube-catalog/imports/missing-preview/retry',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('resumes an incomplete playlist preview before apply is available', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'partial-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/partial-preview?')) {
        return {
          jobId: 'partial-preview',
          operation: 'preview',
          status: 'completed',
          preview: { ...preview, source: { type: 'playlist', value: 'african-list' }, complete: false, hasMore: true },
        };
      }
      if (url.endsWith('/partial-preview/resume')) {
        return { jobId: 'resumed-preview', operation: 'resume', status: 'queued' };
      }
      if (url.includes('/resumed-preview?')) {
        return {
          jobId: 'resumed-preview',
          operation: 'resume',
          status: 'completed',
          preview: { ...preview, source: { type: 'playlist', value: 'african-list' } },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=african-list' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Resume playlist discovery' }));
    expect(await screen.findByText('Discovery is complete. Review every page before applying.')).toBeTruthy();
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/admin/youtube-catalog/imports/partial-preview/resume',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByRole('button', { name: 'Apply reviewed songs' })).toHaveProperty('disabled', true);
  });

  it('restores a persisted preview monitor after remounting', async () => {
    persistJob({ jobId: 'restored-preview', operation: 'preview' }, 'restored-preview');
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.includes('/restored-preview?')) {
        return { jobId: 'restored-preview', operation: 'preview', status: 'completed', preview };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(screen.getByText(/Job restored-preview/)).toBeTruthy();
  });

  it('recovers a retained preview job from server history', async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/history?limit=20')) {
        return {
          jobs: [{
            jobId: 'history-preview',
            operation: 'preview',
            status: 'completed',
            source: { type: 'artist', value: 'Asake' },
            previewJobId: 'history-preview',
            createdAt: '2025-01-01T00:00:00.000Z',
            finishedAt: '2025-01-01T00:01:00.000Z',
          }],
        };
      }
      if (url.includes('/history-preview?')) {
        return { jobId: 'history-preview', operation: 'preview', status: 'completed', preview };
      }
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expandRecentJobs();
    fireEvent.click(await screen.findByRole('button', { name: /Asake/ }));
    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(screen.getByText(/Job history-preview/)).toBeTruthy();
  });

  it('displays candidate-level apply failures and offers an idempotent retry', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'partial-preview', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/partial-preview?')) {
        return { jobId: 'partial-preview', operation: 'preview', status: 'completed', preview };
      }
      if (url.endsWith('/partial-preview/apply')) {
        return { jobId: 'partial-apply', operation: 'apply', status: 'queued' };
      }
      if (url.includes('/partial-apply?')) {
        return {
          jobId: 'partial-apply',
          operation: 'apply',
          status: 'completed',
          result: {
            created: 0,
            linked: 0,
            skipped: 0,
            failed: 1,
            completed: 1,
            total: 1,
            failures: [{ videoId: 'video-123', title: 'African Song', message: 'Temporary database error' }],
          },
        };
      }
      if (url.endsWith('/partial-apply/retry')) {
        return { jobId: 'apply-retry', operation: 'apply', status: 'queued' };
      }
      if (url.includes('/apply-retry?')) {
        return {
          jobId: 'apply-retry',
          operation: 'apply',
          status: 'completed',
          result: { created: 1, linked: 0, skipped: 0, failed: 0, completed: 1, total: 1, failures: [] },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=african-list' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));
    await screen.findByText('African Song');
    selectApplyConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed songs' }));

    expect(await screen.findByText('Candidate failures (1)')).toBeTruthy();
    expect(screen.getByText(/Temporary database error/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed candidates' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/admin/youtube-catalog/imports/partial-apply/retry',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ confirm: true, previewHash: preview.previewHash, selectedVideoIds: ['video-123'] }),
        }),
      );
    });
    expect(await screen.findByText('Created')).toBeTruthy();
  });

  it('restores the reviewed preview needed to retry a partially failed apply', async () => {
    persistJob({ jobId: 'restored-apply', operation: 'apply' }, 'restored-preview');
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.includes('/restored-apply?')) {
        return {
          jobId: 'restored-apply',
          operation: 'apply',
          status: 'completed',
          result: {
            created: 0,
            linked: 0,
            skipped: 0,
            failed: 1,
            completed: 1,
            total: 1,
            failures: [{ videoId: 'video-123', title: 'African Song', message: 'Temporary database error' }],
          },
        };
      }
      if (url.includes('/restored-preview?')) {
        return { jobId: 'restored-preview', operation: 'preview', status: 'completed', preview };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expect(await screen.findByText('Candidate failures (1)')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry failed candidates' })).toHaveProperty('disabled', false);
    });
  });

  it('retries a failed apply using the preview hash from job status', async () => {
    persistJob({ jobId: 'failed-apply', operation: 'apply' });
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.includes('/failed-apply?')) {
        return {
          jobId: 'failed-apply',
          operation: 'apply',
          status: 'failed',
          failedReason: 'job stalled more than allowable limit',
          previewHash: preview.previewHash,
          selectedVideoIds: ['video-123'],
          progress: { stage: 'applying', completed: 6, total: 9, percent: 67 },
          actions: ['retry'],
          message: 'Review the error, then retry when ready.',
        };
      }
      if (url.endsWith('/failed-apply/retry')) {
        return { jobId: 'failed-apply-retry', operation: 'apply', status: 'queued' };
      }
      if (url.includes('/failed-apply-retry?')) {
        return { jobId: 'failed-apply-retry', operation: 'apply', status: 'waiting', progress: null };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    const retryButton = await screen.findByRole('button', { name: 'Retry failed job' });
    await waitFor(() => expect(retryButton).toHaveProperty('disabled', false));
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/admin/youtube-catalog/imports/failed-apply/retry',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            confirm: true,
            previewHash: preview.previewHash,
            selectedVideoIds: ['video-123'],
          }),
        }),
      );
    });
    expect(await screen.findByText(/Waiting for an import worker/)).toBeTruthy();
  });

  it('shows a worker message and an indeterminate bar for a waiting job with null progress', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'waiting-job', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/waiting-job?')) {
        return {
          jobId: 'waiting-job',
          operation: 'preview',
          status: 'waiting',
          progress: null,
          quota: null,
          actions: [],
          message: 'Queued behind other imports; a worker will pick this up shortly.',
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=waiting' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByText(/Waiting for an import worker/)).toBeTruthy();
    expect(screen.getByText(/Queued behind other imports/)).toBeTruthy();
    const progressbar = screen.getByRole('progressbar', { name: 'Preview discovery progress' });
    expect(progressbar.getAttribute('aria-valuenow')).toBeNull();
    expect(screen.getByText('Estimating…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel import' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Recover import' })).toBeNull();
  });

  it('warns about a stalled job and recovers into the returned job id', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'stalled-job', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/stalled-job?')) {
        return {
          jobId: 'stalled-job',
          operation: 'preview',
          status: 'active',
          progress: {
            stage: 'discovering',
            stalled: true,
            stallReason: 'No worker heartbeat for 12 minutes.',
            percent: 40,
            etaSeconds: null,
          },
          actions: ['recover', 'cancel'],
          message: 'Discovery stopped making progress.',
        };
      }
      if (url.endsWith('/stalled-job/recover')) {
        return {
          jobId: 'recovered-job',
          status: 'queued',
          recoveredFrom: 'stalled-job',
          message: 'Recovered the stalled job as recovered-job.',
        };
      }
      if (url.includes('/recovered-job?')) {
        return {
          jobId: 'recovered-job',
          operation: 'preview',
          status: 'completed',
          progress: { stage: 'preview-ready' },
          preview,
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=stalled' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByText(/No worker heartbeat for 12 minutes/)).toBeTruthy();
    expect(screen.getByText(/Discovery stopped making progress/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recover import' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel import' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Recover import' }));

    expect(await screen.findByText(/Job recovered-job/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Preview is ready for review.')).toBeTruthy();
    });
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/admin/youtube-catalog/imports/stalled-job/recover',
      expect.objectContaining({ method: 'POST' }),
    );
    await waitFor(() => {
      expect(JSON.parse(sessionStorage.getItem(PERSISTED_KEY) || '{}')).toMatchObject({
        job: { jobId: 'recovered-job', operation: 'preview' },
      });
    });
  });

  it('cancels an apply job with confirmation while preserving partial imports', async () => {
    let historyCalls = 0;
    persistJob({ jobId: 'partial-apply', operation: 'apply' }, 'preview-job');
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) {
        historyCalls += 1;
        return { jobs: [] };
      }
      if (url.includes('/partial-apply?')) {
        return {
          jobId: 'partial-apply',
          operation: 'apply',
          status: 'active',
          progress: { stage: 'applying', current: 2, total: 5, percent: 40, etaSeconds: 90 },
          actions: ['cancel'],
          message: 'Applying the reviewed preview.',
        };
      }
      if (url.includes('/preview-job?')) {
        return { jobId: 'preview-job', operation: 'preview', status: 'completed', preview };
      }
      if (url.endsWith('/partial-apply/cancel') && options?.method === 'POST') {
        return {
          jobId: 'partial-apply',
          status: 'cancelled',
          cancelled: true,
          preserved: true,
          message: 'Import cancelled. 2 imported songs were kept; the rest were skipped.',
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expect(await screen.findByRole('button', { name: 'Cancel import' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));

    const confirmation = screen.getByRole('alertdialog', { name: 'Confirm cancel import' });
    expect(confirmation.textContent).toMatch(/Songs already imported are kept/);
    expect(confirmation.textContent).toMatch(/remaining songs will be skipped/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    expect(await screen.findByText(/Import cancelled. 2 imported songs were kept/)).toBeTruthy();
    expect(sessionStorage.getItem(PERSISTED_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Preview songs' })).toBeTruthy();
    await waitFor(() => {
      expect(historyCalls).toBeGreaterThanOrEqual(2);
    });
    expect(mockAuthFetch).toHaveBeenCalledWith(
      '/api/admin/youtube-catalog/imports/partial-apply/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows ETA, last-updated age, and backend quota details', async () => {
    const resetAt = '2030-01-01T00:00:00.000Z';
    const lastUpdatedAt = new Date(Date.now() - 90_000).toISOString();
    persistJob({ jobId: 'quota-job', operation: 'preview' });
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.includes('/quota-job?')) {
        return {
          jobId: 'quota-job',
          operation: 'preview',
          status: 'active',
          progress: {
            stage: 'discovering',
            percent: 60,
            etaSeconds: 120,
            lastUpdatedAt,
            quota: { used: 8000, limit: 10000, remaining: 2000, resetAt },
          },
          quota: { used: 8000, limit: 10000, remaining: 2000, resetAt, reason: 'Near daily limit' },
          actions: [],
          message: 'Discovery continues within the daily quota.',
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expect(await screen.findByText(/About 2 min left/)).toBeTruthy();
    expect(screen.getByText(/Last updated/)).toBeTruthy();
    expect(screen.getByText(/Used 8000 of 10000 units/)).toBeTruthy();
    expect(screen.getByText(/2000 remaining/)).toBeTruthy();
    expect(screen.getByText(/Near daily limit/)).toBeTruthy();
    expect(screen.getByText(/Resets at/)).toBeTruthy();
    expect(screen.getByText(/Discovery continues within the daily quota/)).toBeTruthy();
    const progressbar = screen.getByRole('progressbar', { name: 'Preview discovery progress' });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('60');
  });

  it('refreshes the preview after approving an excluded channel', async () => {
    const previewWithChannel = {
      ...preview,
      discovery: {
        ...preview.discovery,
        unreviewedChannels: [{
          channelId: 'channel-new',
          channelTitle: 'Unknown Channel',
          videos: 2,
          sampleTitles: ['Sample song'],
        }],
      },
    };
    let statusCalls = 0;
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.endsWith('/preview') && options?.method === 'POST') {
        return { jobId: 'approval-job', operation: 'preview', status: 'queued' };
      }
      if (url.includes('/approval-job?')) {
        statusCalls += 1;
        return {
          jobId: 'approval-job',
          operation: 'preview',
          status: 'completed',
          progress: { stage: 'preview-ready' },
          preview: statusCalls === 1 ? previewWithChannel : preview,
        };
      }
      if (url === APPROVE_URL && options?.method === 'POST') return { approved: true };
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('YouTube playlist URL'), {
      target: { value: 'https://www.youtube.com/playlist?list=approval' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview songs' }));

    expect(await screen.findByRole('button', { name: 'Approve song' })).toBeTruthy();
    const callsBeforeApproval = statusCalls;
    fireEvent.click(screen.getByRole('button', { name: 'Approve song' }));

    await waitFor(() => {
      expect(statusCalls).toBeGreaterThan(callsBeforeApproval);
    });
    expect(mockAuthFetch).toHaveBeenCalledWith(
      APPROVE_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          channelId: 'channel-new',
          artistName: 'Unknown Channel',
          countryCode: 'NG',
          genres: ['Afrobeats'],
        }),
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Approve song' })).toBeNull();
    });
  });

  it('does not crash when the status payload omits preview, result, and failures', async () => {
    persistJob({ jobId: 'sparse-job', operation: 'apply' });
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return { artists: [], genres: [] };
      if (url.endsWith('/history?limit=20')) return { jobs: [] };
      if (url.includes('/sparse-job?')) {
        return {
          jobId: 'sparse-job',
          operation: 'apply',
          status: 'active',
          progress: {
            stage: 'applying',
            current: 1,
            total: 2,
            percent: 50,
            failures: 'not-an-array',
            etaSeconds: 30,
          },
          preview: null,
          result: null,
          actions: [],
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    renderPage();

    expect(await screen.findByText(/Processed 1 of 2 items/)).toBeTruthy();
    expect(screen.getByText('About 30 sec left')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toBeTruthy();
    expect(screen.queryByText(/Candidate failures/)).toBeNull();
  });
});
