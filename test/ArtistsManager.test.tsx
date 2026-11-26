import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ArtistsManager from '../pages/admin/ArtistsManager';

const {
  mockAuthFetch,
  mockShowNotification,
  mockConfirm,
  mockUploadImage,
  mockGetGenres,
} = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
  mockConfirm: vi.fn(),
  mockUploadImage: vi.fn(),
  mockGetGenres: vi.fn(),
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
    confirm: mockConfirm,
  }),
}));

vi.mock('../services/uploadService', () => ({
  uploadImage: mockUploadImage,
}));

vi.mock('../lib/apiClient', () => ({
  getGenres: mockGetGenres,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ArtistsManager />
    </MemoryRouter>,
  );
}

describe('ArtistsManager', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    mockConfirm.mockReset();
    mockUploadImage.mockReset();
    mockGetGenres.mockReset();
    mockConfirm.mockResolvedValue(false);
    mockGetGenres.mockResolvedValue([{ id: 'genre-1', name: 'Afrobeats' }]);
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method !== 'GET') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname !== '/api/admin/artists') return {};
      const limit = Number(parsed.searchParams.get('limit'));
      const page = Number(parsed.searchParams.get('page') || 1);
      const search = parsed.searchParams.get('search');
      const genre = parsed.searchParams.get('genre');
      if (limit === 1) {
        return { artists: [], total: 30, totalPages: 1, verifiedCount: 5, suspendedCount: 2, featuredCount: 3 };
      }
      return {
        artists: [{
          id: `artist-page-${page}`,
          name: `Artist page ${page}`,
          bio: '',
          imageUrl: '',
          genres: ['Afrobeats'],
          verified: true,
          suspended: false,
          isFeatured: false,
          popularity: 10,
          followers: 100,
          createdAt: '2025-01-01T00:00:00.000Z',
          user: { email: `artist${page}@example.com` },
          _count: { songs: 4, releases: 1 },
        }],
        total: search || genre ? 1 : 30,
        totalPages: search || genre ? 1 : 2,
        verifiedCount: 5,
        suspendedCount: 2,
        featuredCount: 3,
      };
    });
  });

  it('loads server-backed pages and reports status totals', async () => {
    renderPage();

    expect(await screen.findAllByText('Artist page 1')).toHaveLength(2);
    expect(screen.getByText('Showing 1 to 20 of 30 artists')).toBeTruthy();
    expect(screen.getAllByText('30')).toHaveLength(2);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findAllByText('Artist page 2')).toHaveLength(2);
    await waitFor(() => {
      const pageTwoCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/artists'
          && parsed.searchParams.get('page') === '2'
          && parsed.searchParams.get('limit') === '20';
      });
      expect(pageTwoCall).toBeTruthy();
    });
  });

  it('sends search and genre filters to the server', async () => {
    renderPage();

    await screen.findAllByText('Artist page 1');
    fireEvent.change(screen.getByPlaceholderText('Search by name or email...'), {
      target: { value: 'burna' },
    });
    fireEvent.change(screen.getByLabelText('Genre'), {
      target: { value: 'Afrobeats' },
    });

    await waitFor(() => {
      const filteredCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/artists'
          && parsed.searchParams.get('search') === 'burna'
          && parsed.searchParams.get('genre') === 'Afrobeats';
      });
      expect(filteredCall).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });

  it('toggles verification through the admin API', async () => {
    renderPage();

    await screen.findAllByText('Artist page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Unverify' })[0]);

    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/artists/artist-page-1/verify' && options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Artist unverified!', type: 'success' }),
    );
  });

  it('requires confirmation before suspending an artist', async () => {
    mockConfirm.mockResolvedValue(true);
    renderPage();

    await screen.findAllByText('Artist page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Suspend' })[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Suspend Artist' }));
    });
    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/artists/artist-page-1/suspend' && options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Artist suspended!', type: 'success' }),
    );
  });

  it('creates an artist with selected genres through the artists API', async () => {
    renderPage();

    await screen.findAllByText('Artist page 1');
    fireEvent.click(screen.getByRole('button', { name: 'Add Artist' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add artist' });

    fireEvent.change(within(dialog).getByLabelText('Artist Name'), {
      target: { value: 'Wizkid' },
    });
    fireEvent.click(within(dialog).getByLabelText('Afrobeats'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Artist' }));

    await waitFor(() => {
      const postCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/artists' && options?.method === 'POST');
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({
        name: 'Wizkid',
        genres: ['Afrobeats'],
        verified: false,
      });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Artist added successfully!', type: 'success' }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add artist' })).toBeNull();
    });
  });

  it('asks for confirmation before deleting an artist', async () => {
    mockConfirm.mockResolvedValue(true);
    renderPage();

    await screen.findAllByText('Artist page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Delete Artist' }));
    });
    await waitFor(() => {
      const deleteCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/artists/artist-page-1' && options?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
  });
});
