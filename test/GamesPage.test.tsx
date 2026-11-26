import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GamesPage from '../pages/GamesPage';
import { gamesService } from '../services/gamesService';
import type { DailyGamesManifest } from '../types/games';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('../services/gamesService', () => ({
  gamesService: {
    getDailyManifest: vi.fn(),
    getDailyProgress: vi.fn(),
    getGuestToken: vi.fn(),
  },
}));

const manifest: DailyGamesManifest = {
  puzzleDate: '2026-11-04',
  puzzleNumber: 308,
  level: 8,
  resetsAt: '2026-11-05T00:00:00.000Z',
  games: [
    { id: 'lyrics', name: 'Lyric Genie', description: 'Guess the song from its clues.', attemptLimit: 6 },
    { id: 'star-seeker', name: 'Star Seeker', description: 'Identify the artist.', attemptLimit: 10 },
    { id: 'rhythm-groups', name: 'Rhythm Groups', description: 'Sort sixteen tiles.', attemptLimit: 4 },
    { id: 'daily-beads', name: 'Daily Beads', description: 'Answer five trivia questions.', attemptLimit: 5 },
  ],
};

describe('GamesPage', () => {
  beforeEach(() => {
    vi.mocked(gamesService.getDailyManifest).mockResolvedValue(manifest);
    vi.mocked(gamesService.getDailyProgress).mockResolvedValue({
      puzzleDate: manifest.puzzleDate,
      statuses: {},
    });
    vi.mocked(gamesService.getGuestToken).mockReturnValue(null);
  });

  it('lists the daily games and links to their play routes', async () => {
    render(<MemoryRouter><GamesPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Play today’s music games' })).toBeInTheDocument();
    for (const game of manifest.games) {
      expect(screen.getByRole('heading', { name: game.name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: 'Play now' }).map((link) => link.getAttribute('href')))
      .toEqual(manifest.games.map((game) => `/games/${game.id}`));
    expect(screen.getByText('2026-11-04 · UTC')).toBeInTheDocument();
    expect(gamesService.getDailyProgress).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable error when the daily manifest cannot load', async () => {
    vi.mocked(gamesService.getDailyManifest).mockRejectedValueOnce(new Error('Games API unavailable'));
    render(<MemoryRouter><GamesPage /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Games API unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(gamesService.getDailyManifest).toHaveBeenCalledTimes(2));
  });

  it('reloads the manifest when progress crosses the UTC puzzle reset', async () => {
    const nextDayManifest = {
      ...manifest,
      puzzleDate: '2026-11-05',
      puzzleNumber: manifest.puzzleNumber + 1,
      resetsAt: '2026-11-06T00:00:00.000Z',
    };
    vi.mocked(gamesService.getDailyManifest)
      .mockResolvedValueOnce(manifest)
      .mockResolvedValueOnce(nextDayManifest);
    vi.mocked(gamesService.getDailyProgress)
      .mockResolvedValueOnce({ puzzleDate: nextDayManifest.puzzleDate, statuses: {} })
      .mockResolvedValueOnce({ puzzleDate: nextDayManifest.puzzleDate, statuses: {} });

    render(<MemoryRouter><GamesPage /></MemoryRouter>);

    expect(await screen.findByText('2026-11-05 · UTC')).toBeInTheDocument();
    expect(gamesService.getDailyManifest).toHaveBeenCalledTimes(2);
    expect(gamesService.getDailyProgress).toHaveBeenCalledTimes(2);
  });

  it('sends saved guest tokens in one progress request', async () => {
    vi.mocked(gamesService.getGuestToken).mockImplementation((gameId) =>
      gameId === 'lyrics' ? 'a'.repeat(43) : null,
    );

    render(<MemoryRouter><GamesPage /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Lyric Genie' });
    expect(gamesService.getDailyProgress).toHaveBeenCalledWith({ lyrics: 'a'.repeat(43) });
  });

  it('renders saved statuses from the batch progress response', async () => {
    vi.mocked(gamesService.getDailyProgress).mockResolvedValue({
      puzzleDate: manifest.puzzleDate,
      statuses: { lyrics: 'IN_PROGRESS', 'daily-beads': 'WON' },
    });

    render(<MemoryRouter><GamesPage /></MemoryRouter>);

    const continueLinks = await screen.findAllByRole('link', { name: 'Continue' });
    expect(continueLinks.map((link) => link.getAttribute('href')))
      .toEqual(['/games/lyrics', '/games/daily-beads']);
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Completed · won')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Play now' })).toHaveLength(2);
  });
});
