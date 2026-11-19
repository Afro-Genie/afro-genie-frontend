import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportSongsPage from '../pages/admin/ImportSongsPage';

const { mockAuthFetch } = vi.hoisted(() => ({ mockAuthFetch: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

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

describe('ImportSongsPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    sessionStorage.clear();
  });

  it('previews candidates, requires confirmation, and displays apply results', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
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

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed songs' }));

    expect(await screen.findByText('Created')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('Processed 1 of 1')).toBeTruthy();
    });
    const applyRequest = mockAuthFetch.mock.calls.find(([url, options]) => url.endsWith('/preview-job/apply') && options?.method === 'POST');
    expect(JSON.parse(applyRequest[1].body as string)).toEqual({
      confirm: true,
      previewHash: preview.previewHash,
    });
  });

  it('shows quota failures and offers an explicit retry', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
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

  it('resumes an incomplete playlist preview before apply is available', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
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
    sessionStorage.setItem('afro-genie-admin-youtube-import', JSON.stringify({
      job: { jobId: 'restored-preview', operation: 'preview' },
      previewJobId: 'restored-preview',
      quotaEstimate: preview.discovery.quotaEstimate,
    }));
    mockAuthFetch.mockImplementation(async (url: string) => {
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

    fireEvent.click(await screen.findByRole('button', { name: /Asake/ }));
    expect(await screen.findByText('African Song')).toBeTruthy();
    expect(screen.getByText(/Job history-preview/)).toBeTruthy();
  });

  it('displays candidate-level apply failures and offers an idempotent retry', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
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
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply reviewed songs' }));

    expect(await screen.findByText('Candidate failures (1)')).toBeTruthy();
    expect(screen.getByText(/Temporary database error/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed candidates' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/admin/youtube-catalog/imports/partial-apply/retry',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ confirm: true, previewHash: preview.previewHash }),
        }),
      );
    });
    expect(await screen.findByText('Created')).toBeTruthy();
  });

  it('restores the reviewed preview needed to retry a partially failed apply', async () => {
    sessionStorage.setItem('afro-genie-admin-youtube-import', JSON.stringify({
      job: { jobId: 'restored-apply', operation: 'apply' },
      previewJobId: 'restored-preview',
      quotaEstimate: null,
    }));
    mockAuthFetch.mockImplementation(async (url: string) => {
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
});
