import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddSongPage from '../pages/admin/AddSongPage';

const { mockAuthFetch, mockGetArtists, mockGetAllLanguages } = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockGetArtists: vi.fn(),
  mockGetAllLanguages: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, authFetch: mockAuthFetch }),
}));

vi.mock('../hooks/useNotification', () => ({
  useNotification: () => ({
    notification: null,
    showNotification: vi.fn(),
    hideNotification: vi.fn(),
  }),
}));

vi.mock('../lib/apiClient', () => ({
  getArtists: mockGetArtists,
}));

vi.mock('../services/languageService', () => ({
  getAllLanguages: mockGetAllLanguages,
  addLanguage: vi.fn(),
}));

describe('AddSongPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockGetArtists.mockReset();
    mockGetAllLanguages.mockReset();
    mockGetArtists.mockResolvedValue({
      data: [{
        id: 'asake-id',
        name: 'Asake',
        genres: ['Afrobeats'],
        imageUrl: null,
      }],
      total: 1,
    });
    mockGetAllLanguages.mockResolvedValue([]);
    mockAuthFetch.mockResolvedValue({
      artists: [{ name: 'Asake', genres: ['Afrobeats'] }],
      genres: ['Afrobeats'],
    });
  });

  it('offers approved African genres and narrows them to the selected configured artist', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AddSongPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/youtube-catalog/imports/sources');
    });
    const genreField = screen.getByText('African Music Genre').parentElement?.querySelector('select');
    expect(genreField).toBeTruthy();
    expect(genreField).toHaveProperty('disabled', false);

    await user.click(screen.getByRole('combobox', { name: /Artist ID/i }));
    await user.click(await screen.findByRole('button', { name: /Asake/ }));

    expect(genreField).toHaveProperty('disabled', false);
    expect(Array.from(genreField?.querySelectorAll('option') || []).map((option) => option.value)).toEqual([
      '',
      'Afrobeats',
    ]);
  });
});
