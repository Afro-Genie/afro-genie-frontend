import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SongsManager from '../pages/admin/SongsManager';

const {
  mockGetArtists,
  mockGetGenres,
  mockAuthFetch,
  mockShowNotification,
} = vi.hoisted(() => ({
  mockGetArtists: vi.fn(),
  mockGetGenres: vi.fn(),
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
}));

vi.mock('../lib/apiClient', () => ({
  getArtists: mockGetArtists,
  getGenres: mockGetGenres,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ authFetch: mockAuthFetch }),
}));

vi.mock('../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showNotification: mockShowNotification,
    hideNotification: vi.fn(),
  }),
}));

vi.mock('../hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirmState: null,
    confirm: vi.fn().mockResolvedValue(false),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SongsManager />
    </MemoryRouter>,
  );
}

describe('SongsManager', () => {
  beforeEach(() => {
    mockGetArtists.mockReset();
    mockGetGenres.mockReset();
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    sessionStorage.clear();
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method !== 'GET') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      if (!parsed.pathname.startsWith('/api/admin/songs')) return {};
      const limit = Number(parsed.searchParams.get('limit'));
      const page = Number(parsed.searchParams.get('page') || 1);
      const search = parsed.searchParams.get('search');
      const artistName = parsed.searchParams.get('artistName');
      if (limit === 1) {
        return { songs: [], total: search || artistName ? 1 : 45, totalPages: 1 };
      }
      return {
        songs: [{
          id: `song-page-${page}`,
          title: `Song page ${page}`,
          artist: { id: 'artist-1', name: 'Asake' },
          genres: [{ genre: { name: 'Afrobeats' } }],
          createdAt: '2025-03-15T12:30:00.000Z',
        }],
        total: search || artistName ? 1 : 45,
        totalPages: search || artistName ? 1 : 3,
      };
    });
    mockGetArtists.mockImplementation(async (params?: Record<string, string | number | undefined>) => ({
      data: params?.limit === 100 ? [{ id: 'artist-1', name: 'Asake', genres: ['Afrobeats'] }] : [],
      total: 32,
    }));
    mockGetGenres.mockResolvedValue([{ id: 'genre-1', name: 'Afrobeats' }]);
  });

  it('loads server-backed pages and reports the full catalog totals', async () => {
    renderPage();

    expect(await screen.findAllByText('Song page 1')).toHaveLength(2);
    expect(screen.getAllByText('45')).toHaveLength(2);
    expect(screen.getByText('32')).toBeTruthy();
    expect(screen.getByText('Showing 1 to 20 of 45 songs')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findAllByText('Song page 2')).toHaveLength(2);
    await waitFor(() => {
      const pageTwoCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/songs'
          && parsed.searchParams.get('page') === '2'
          && parsed.searchParams.get('limit') === '20';
      });
      expect(pageTwoCall).toBeTruthy();
    });
  });

  it('links View to the shared playback route for every row', async () => {
    renderPage();

    await screen.findAllByText('Song page 1');
    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks).toHaveLength(2);
    for (const link of viewLinks) {
      expect(link.getAttribute('href')).toBe('/songs/song-page-1');
    }
  });

  it('renders nested artist and genre objects as text and proxies backend upload URLs', async () => {
    mockAuthFetch.mockImplementation(async (url: string) => {
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname !== '/api/admin/songs') return {};
      if (parsed.searchParams.get('limit') === '1') return { songs: [], total: 1, totalPages: 1 };
      return {
        songs: [{
          id: 'nested-song',
          title: 'Nested Song',
          artist: { id: 'artist-2', name: 'Burna Boy', imageUrl: null, genres: ['Afrobeats'] },
          genre: { id: 'genre-2', name: 'Afrobeats', imageUrl: null, genres: [] },
          imageUrl: 'https://afro-genie-backend-production.up.railway.app/uploads/cover.jpg',
        }],
        total: 1,
        totalPages: 1,
      };
    });

    renderPage();

    expect(await screen.findAllByText('Nested Song')).toHaveLength(2);
    expect(screen.getAllByText('Burna Boy')).toHaveLength(2);
    expect(screen.getAllByText('Afrobeats')).toHaveLength(3);

    const covers = screen.getAllByRole('img');
    expect(covers[0].getAttribute('src')).toBe('/uploads/cover.jpg');
    covers.forEach((cover) => fireEvent.error(cover));
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('sends search and artist filters to the server rather than filtering the current page', async () => {
    renderPage();

    await screen.findAllByText('Song page 1');
    fireEvent.change(screen.getByPlaceholderText('Search by title, artist, or genre...'), {
      target: { value: 'Asake' },
    });
    fireEvent.change(screen.getByPlaceholderText('Filter by any artist…'), {
      target: { value: 'Asake' },
    });

    await waitFor(() => {
      const filteredCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/songs'
          && parsed.searchParams.get('search') === 'Asake'
          && parsed.searchParams.get('artistName') === 'Asake';
      });
      expect(filteredCall).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });

  it('opens a row edit modal and saves changes through the song API', async () => {
    renderPage();

    fireEvent.click((await screen.findAllByText('Song page 1'))[0]);
    expect(await screen.findByRole('dialog', { name: 'Edit song' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Renamed Song' } });
    fireEvent.change(screen.getByLabelText('Artist'), { target: { value: 'Rema' } });
    fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'Afrobeat' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2025' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([, options]) => options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
        title: 'Renamed Song',
        artistName: 'Rema',
        releaseYear: 2025,
        genres: ['Afrobeat'],
      });
    });
    expect(screen.queryByRole('dialog', { name: 'Edit song' })).toBeNull();
  });

  it('forces a fresh admin songs request when the import flow asks for a refresh', async () => {
    sessionStorage.setItem('afro-genie:admin:songs:refresh', '1');
    renderPage();

    await waitFor(() => {
      const freshCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/songs' && parsed.searchParams.has('_ts');
      });
      expect(freshCall).toBeTruthy();
    });
    expect(sessionStorage.getItem('afro-genie:admin:songs:refresh')).toBeNull();
  });
});
