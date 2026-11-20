import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SongsManager from '../pages/admin/SongsManager';

const {
  mockGetSongs,
  mockGetArtists,
  mockGetGenres,
  mockAuthFetch,
  mockShowNotification,
} = vi.hoisted(() => ({
  mockGetSongs: vi.fn(),
  mockGetArtists: vi.fn(),
  mockGetGenres: vi.fn(),
  mockAuthFetch: vi.fn(),
  mockShowNotification: vi.fn(),
}));

vi.mock('../lib/apiClient', () => ({
  getSongs: mockGetSongs,
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
    closeConfirm: vi.fn(),
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
    mockGetSongs.mockReset();
    mockGetArtists.mockReset();
    mockGetGenres.mockReset();
    mockAuthFetch.mockReset();
    mockShowNotification.mockReset();
    mockGetSongs.mockImplementation(async (params: Record<string, string | number | undefined>) => ({
      songs: [{
        id: `song-page-${params.page}`,
        title: `Song page ${params.page}`,
        artist: { id: 'artist-1', name: 'Asake' },
        genres: [{ genre: { name: 'Afrobeats' } }],
        createdAt: '2025-03-15T12:30:00.000Z',
      }],
      total: params.search || params.artistName ? 1 : 45,
      totalPages: params.search || params.artistName ? 1 : 3,
    }));
    mockGetArtists.mockResolvedValue({ data: [], total: 32 });
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
      expect(mockGetSongs).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 20 }));
    });
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
      expect(mockGetSongs).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        search: 'Asake',
        artistName: 'Asake',
      }));
    });
    await waitFor(() => {
      expect(screen.getByText('Filtered Results').nextElementSibling?.textContent).toBe('1');
    });
  });
});
