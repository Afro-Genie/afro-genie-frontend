import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ArtistSearchSelect from '../components/admin/ArtistSearchSelect';

const { mockGetArtists } = vi.hoisted(() => ({ mockGetArtists: vi.fn() }));

vi.mock('../lib/apiClient', () => ({
  getArtists: mockGetArtists,
}));

describe('ArtistSearchSelect', () => {
  it('searches beyond the initially loaded artist page', async () => {
    mockGetArtists.mockResolvedValue({
      data: [{
        id: 'artist-outside-first-page',
        name: 'Fola Beyond',
        genres: ['Afrobeats'],
        imageUrl: null,
      }],
      total: 1,
      nextCursor: null,
    });
    const onChange = vi.fn();

    render(
      <ArtistSearchSelect
        artists={[{ id: 'artist-first-page', name: 'First Page Artist', genre: 'Afrobeats', image: '' }]}
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Fola Beyond' } });

    const option = await screen.findByRole('option');
    expect(option.textContent).toContain('Fola Beyond');
    expect(mockGetArtists).toHaveBeenCalledWith({ search: 'Fola Beyond', limit: 50 });
    fireEvent.click(screen.getByRole('button', { name: /Fola Beyond/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('artist-outside-first-page'));
  });
});
