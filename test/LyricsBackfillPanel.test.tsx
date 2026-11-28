import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LyricsBackfillPanel from '../components/admin/LyricsBackfillPanel';

const { mockAuthFetch } = vi.hoisted(() => ({ mockAuthFetch: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ authFetch: mockAuthFetch }) }));

describe('LyricsBackfillPanel', () => {
  beforeEach(() => { mockAuthFetch.mockReset(); sessionStorage.clear(); });

  it('previews new scope, requires confirmation, and reports outcomes', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/history?limit=20')) return { jobs: [{ jobId: 'admin-lyrics', type: 'admin-lyrics-backfill', status: 'completed', scope: 'new', attribution: 'admin', adminId: 'admin-1', createdAt: '2026-11-18T06:00:00.000Z', result: { populated: 2, providerMisses: 2, failed: 1 } }] };
      if (url.includes('/preview?scope=new')) return { youtubeLinked: 20, populated: 14, eligible: 5, takedownExcluded: 1, newEligible: 5, missedEligible: 2, scope: 'new', previewHash: 'a'.repeat(64) };
      if (url.endsWith('/lyrics-backfill') && options?.method === 'POST') return { jobId: 'lyrics-job-1', status: 'queued', eligible: 5, scope: 'new' };
      if (url.endsWith('/lyrics-job-1')) return { jobId: 'lyrics-job-1', status: 'completed', scope: 'new', progress: { stage: 'lyrics-backfill' }, result: { total: 5, completed: 5, providerHits: 2, providerMisses: 2, failed: 1, populated: 2, remaining: 3, scope: 'new', failures: [{ songId: 'song-5', title: 'Song Five', message: 'Provider timeout' }] } };
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<LyricsBackfillPanel />);
    expect(await screen.findByText('Selected scope')).toBeTruthy();
    const runButton = await screen.findByRole('button', { name: 'Run new backfill' });
    expect(runButton).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(runButton);
    expect(await screen.findByText(/Provider timeout/)).toBeTruthy();
    await waitFor(() => {
      const request = mockAuthFetch.mock.calls.find(([url, options]) => url === '/api/admin/sync/lyrics-backfill' && options?.method === 'POST');
      expect(request).toBeTruthy();
      expect(JSON.parse(request?.[1].body as string)).toMatchObject({ confirm: true, previewHash: 'a'.repeat(64), scope: 'new' });
    });
  });

  it('loads missed songs and saves manual lyrics', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/history?limit=20')) return { jobs: [] };
      if (url.includes('/preview?scope=missed')) return { youtubeLinked: 20, populated: 14, eligible: 1, takedownExcluded: 1, newEligible: 3, missedEligible: 1, scope: 'missed', previewHash: 'b'.repeat(64) };
      if (url.includes('/missed?limit=20&page=1')) return { items: [{ id: 'song-1', title: 'Missed Song', artist: { name: 'Artist' }, lyricsBackfillMissedAt: '2026-11-20T00:00:00.000Z' }], total: 1, page: 1, limit: 20 };
      if (url.endsWith('/api/lyrics/song-1') && !options?.method) return { songId: 'song-1', content: null, syncedLyrics: null };
      if (url.endsWith('/api/admin/lyrics/song-1') && options?.method === 'PATCH') return { id: 'song-1', content: 'hello' };
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<LyricsBackfillPanel />);
    fireEvent.change(await screen.findByDisplayValue('New / never-missed'), { target: { value: 'missed' } });
    expect(await screen.findByText('Missed Song')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add lyrics manually' }));
    fireEvent.change(await screen.findByPlaceholderText('Line by line lyrics...'), { target: { value: 'hello world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save lyrics' }));
    await waitFor(() => {
      const req = mockAuthFetch.mock.calls.find(([url, options]) => url.endsWith('/api/admin/lyrics/song-1') && options?.method === 'PATCH');
      expect(req).toBeTruthy();
      expect(JSON.parse(req?.[1].body as string)).toMatchObject({ content: 'hello world' });
    });
  });
});


