import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenresManager from '../pages/admin/GenresManager';

const {
  mockAuthFetch,
  mockShowNotification,
  mockConfirm,
  mockUploadImage,
} = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
  mockConfirm: vi.fn(),
  mockUploadImage: vi.fn(),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <GenresManager />
    </MemoryRouter>,
  );
}

describe('GenresManager', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    mockConfirm.mockReset();
    mockUploadImage.mockReset();
    mockConfirm.mockResolvedValue(false);
    mockAuthFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method ?? 'GET';
      if (method !== 'GET') return { success: true };
      const parsed = new URL(url, 'http://localhost');
      if (parsed.pathname !== '/api/admin/genres') return {};
      const limit = Number(parsed.searchParams.get('limit'));
      const page = Number(parsed.searchParams.get('page') || 1);
      const search = parsed.searchParams.get('search');
      if (limit === 1) {
        return { data: [], total: 12, totalPages: 1, totalSongLinks: 40, genresInUse: 8 };
      }
      return {
        data: [{
          id: `genre-page-${page}`,
          name: `Genre page ${page}`,
          imageUrl: '',
          _count: { songs: 3 },
        }],
        total: search ? 1 : 12,
        totalPages: search ? 1 : 2,
        totalSongLinks: 40,
        genresInUse: 8,
      };
    });
  });

  it('loads server-backed pages and reports catalog totals', async () => {
    renderPage();

    expect(await screen.findAllByText('Genre page 1')).toHaveLength(2);
    expect(screen.getByText('Showing 1 to 12 of 12 genres')).toBeTruthy();
    expect(screen.getAllByText('12')).toHaveLength(2);
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findAllByText('Genre page 2')).toHaveLength(2);
    await waitFor(() => {
      const pageTwoCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/genres'
          && parsed.searchParams.get('page') === '2'
          && parsed.searchParams.get('limit') === '20';
      });
      expect(pageTwoCall).toBeTruthy();
    });
  });

  it('sends search to the server rather than filtering the current page', async () => {
    renderPage();

    await screen.findAllByText('Genre page 1');
    fireEvent.change(screen.getByPlaceholderText('Search by genre name...'), {
      target: { value: 'afro' },
    });

    await waitFor(() => {
      const filteredCall = mockAuthFetch.mock.calls.find(([url]) => {
        const parsed = new URL(String(url), 'http://localhost');
        return parsed.pathname === '/api/admin/genres'
          && parsed.searchParams.get('search') === 'afro';
      });
      expect(filteredCall).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });

  it('creates a genre through the admin API', async () => {
    renderPage();

    await screen.findAllByText('Genre page 1');
    fireEvent.click(screen.getByRole('button', { name: 'Add Genre' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add genre' });

    fireEvent.change(within(dialog).getByLabelText('Genre Name'), {
      target: { value: 'Amapiano' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Genre' }));

    await waitFor(() => {
      const postCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/genres' && options?.method === 'POST');
      expect(postCall).toBeTruthy();
      expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject({ name: 'Amapiano' });
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Genre added successfully!', type: 'success' }),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add genre' })).toBeNull();
    });
  });

  it('opens a row edit modal and saves changes through the admin API', async () => {
    renderPage();

    fireEvent.click((await screen.findAllByText('Genre page 1'))[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Edit genre' });

    fireEvent.change(within(dialog).getByLabelText('Genre Name'), {
      target: { value: 'Renamed Genre' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const patchCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/genres/genre-page-1' && options?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({ name: 'Renamed Genre' });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Edit genre' })).toBeNull();
    });
  });

  it('asks for confirmation before deleting and warns about linked songs', async () => {
    mockConfirm.mockResolvedValue(true);
    renderPage();

    await screen.findAllByText('Genre page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Delete Genre',
        message: expect.stringContaining('3 songs will lose this genre tag'),
      }));
    });
    await waitFor(() => {
      const deleteCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        String(url) === '/api/admin/genres/genre-page-1' && options?.method === 'DELETE');
      expect(deleteCall).toBeTruthy();
    });
    expect(mockShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Genre deleted successfully!', type: 'success' }),
    );
  });

  it('does not delete when confirmation is cancelled', async () => {
    mockConfirm.mockResolvedValue(false);
    renderPage();

    await screen.findAllByText('Genre page 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    const deleteCall = mockAuthFetch.mock.calls.find(([, options]) => options?.method === 'DELETE');
    expect(deleteCall).toBeUndefined();
  });
});
