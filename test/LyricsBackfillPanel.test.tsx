import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LyricsBackfillPanel from '../components/admin/LyricsBackfillPanel';

const { mockAuthFetch } = vi.hoisted(() => ({ mockAuthFetch: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

describe('LyricsBackfillPanel', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    sessionStorage.clear();
  });

  it('previews missing songs, requires confirmation, and reports backfill outcomes', async () => {
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith('/history?limit=20')) {
        return {
          jobs: [
            {
              jobId: 'scheduled-lyrics',
              type: 'backfill-lyrics',
              status: 'completed',
              attribution: 'scheduled',
              adminId: null,
              createdAt: '2026-11-18T05:00:00.000Z',
              result: { enqueued: 5 },
            },
            {
              jobId: 'admin-lyrics',
              type: 'admin-lyrics-backfill',
              status: 'completed',
              attribution: 'admin',
              adminId: 'admin-1',
              createdAt: '2026-11-18T06:00:00.000Z',
              result: { populated: 2, providerMisses: 2, failed: 1 },
            },
          ],
        };
      }
      if (url.endsWith('/preview')) {
        return {
          youtubeLinked: 20,
          populated: 14,
          eligible: 5,
          takedownExcluded: 1,
          previewHash: 'a'.repeat(64),
        };
      }
      if (url.endsWith('/lyrics-backfill') && options?.method === 'POST') {
        return { jobId: 'lyrics-job-1', status: 'queued', eligible: 5 };
      }
      if (url.endsWith('/lyrics-job-1')) {
        return {
          jobId: 'lyrics-job-1',
          status: 'completed',
          progress: { stage: 'lyrics-backfill' },
          result: {
            total: 5,
            completed: 5,
            providerHits: 2,
            providerMisses: 2,
            failed: 1,
            populated: 2,
            remaining: 3,
            failures: [{ songId: 'song-5', title: 'Song Five', message: 'Provider timeout' }],
          },
        };
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<LyricsBackfillPanel />);

    expect(await screen.findByText('Eligible to backfill')).toBeTruthy();
    expect(await screen.findByText('Recent scheduled and admin backfills')).toBeTruthy();
    expect(screen.getByText(/Started by admin admin-1/)).toBeTruthy();
    const runButton = screen.getByRole('button', { name: 'Run lyrics backfill' });
    expect(runButton).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(runButton);

    expect(await screen.findByText(/Provider timeout/)).toBeTruthy();
    expect(document.body.textContent).toContain('3 songs still need lyrics');
    await waitFor(() => {
      const request = mockAuthFetch.mock.calls.find(([url, options]) =>
        url === '/api/admin/sync/lyrics-backfill' && options?.method === 'POST',
      );
      expect(request).toBeTruthy();
      expect(JSON.parse(request?.[1].body as string)).toMatchObject({
        confirm: true,
        previewHash: 'a'.repeat(64),
      });
      expect(JSON.parse(request?.[1].body as string).requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });
});
