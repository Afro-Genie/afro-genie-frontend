import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddSongPage from '../pages/admin/AddSongPage';

const { mockAuthFetch, mockGetArtists, mockGetAllLanguages, mockUploadImage } = vi.hoisted(() => ({
  mockAuthFetch: vi.fn(),
  mockGetArtists: vi.fn(),
  mockGetAllLanguages: vi.fn(),
  mockUploadImage: vi.fn(),
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

vi.mock('../services/uploadService', () => ({
  uploadImage: mockUploadImage,
}));

describe('AddSongPage', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockGetArtists.mockReset();
    mockGetAllLanguages.mockReset();
    mockUploadImage.mockReset();
    mockUploadImage.mockResolvedValue('/uploads/cover.jpg');
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

  it('uploads a selected cover image before creating the song', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <AddSongPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/youtube-catalog/imports/sources');
    });

    const titleInput = screen.getByText(/Song Title/).parentElement?.querySelector('input') as HTMLInputElement;
    await user.type(titleInput, 'Uploaded Cover Song');
    await user.click(screen.getByRole('combobox', { name: /Artist ID/i }));
    await user.click(await screen.findByRole('button', { name: /Asake/ }));

    const genreField = screen.getByText(/African Music Genre/).parentElement?.querySelector('select') as HTMLSelectElement;
    await user.selectOptions(genreField, 'Afrobeats');

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Add Song/ }));

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(expect.any(File), 'songs/new');
    });
    await waitFor(() => {
      const createCall = mockAuthFetch.mock.calls.find(([url, options]) =>
        url === '/api/songs' && options?.method === 'POST');
      expect(createCall).toBeTruthy();
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        title: 'Uploaded Cover Song',
        coverImageUrl: '/uploads/cover.jpg',
      });
    });
  });
});
