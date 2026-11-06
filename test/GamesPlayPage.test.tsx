import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GamesPlayPage from '../pages/GamesPlayPage';
import { gamesService } from '../services/gamesService';

const { authState } = vi.hoisted(() => ({
  authState: { user: null as null | { id: string }, loading: false },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../services/gamesService', () => ({
  gamesService: {
    getDailyGame: vi.fn(),
    getGuestToken: vi.fn(),
    getState: vi.fn(),
    createGuestSession: vi.fn(),
    saveGuestToken: vi.fn(),
    clearGuestToken: vi.fn(),
    submitAction: vi.fn(),
  },
}));

const dailyGame = {
  puzzleDate: '2026-11-04',
  puzzleNumber: 308,
  level: 8,
  resetsAt: '2026-11-05T00:00:00.000Z',
  puzzle: {
    game: 'DAILY_BEADS' as const,
    level: 8,
    puzzleDate: '2026-11-04',
    questions: [{
      id: 'question-1',
      prompt: 'Which country is associated with this music fact?',
      options: [
        { id: 'answer-a', label: 'Option A' },
        { id: 'answer-b', label: 'Option B' },
        { id: 'answer-c', label: 'Option C' },
        { id: 'answer-d', label: 'Option D' },
      ],
    }, {
      id: 'question-2',
      prompt: 'Second question',
      options: [{ id: 'answer-a', label: 'Option A' }],
    }],
    questionCount: 5,
    winThreshold: 3,
  },
};

const guestSession = {
  token: 'guest-token',
  expiresAt: '2026-12-04T00:00:00.000Z',
  puzzleDate: '2026-11-04',
  play: {
    playId: 'play-1',
    status: 'IN_PROGRESS' as const,
    state: { answers: [], score: 0 },
    won: null,
    score: null,
    completedAt: null,
  },
};

describe('GamesPlayPage', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    vi.mocked(gamesService.getDailyGame).mockResolvedValue(dailyGame);
    vi.mocked(gamesService.getGuestToken).mockReturnValue(null);
    vi.mocked(gamesService.getState).mockReset();
    vi.mocked(gamesService.createGuestSession).mockResolvedValue(guestSession);
    vi.mocked(gamesService.submitAction).mockReset();
  });

  it('loads a guest session and only advances after the server saves an answer', async () => {
    vi.mocked(gamesService.submitAction)
      .mockRejectedValueOnce(new Error('Could not save your answer'))
      .mockResolvedValueOnce({
        puzzleDate: dailyGame.puzzleDate,
        play: {
          ...guestSession.play,
          state: {
            answers: [{ questionId: 'question-1', optionId: 'answer-a', correct: true }],
            score: 1,
            answeredQuestions: [{
              questionId: 'question-1',
              optionId: 'answer-a',
              correct: true,
              correctOptionId: 'answer-a',
              explanation: 'A reviewed explanation.',
            }],
          },
        },
        feedback: {
          questionId: 'question-1',
          optionId: 'answer-a',
          correct: true,
          correctOptionId: 'answer-a',
          explanation: 'A reviewed explanation.',
          score: 1,
        },
      });

    render(
      <MemoryRouter initialEntries={['/games/daily-beads']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Which country is associated/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Option A' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your answer');
    expect(screen.getByText(/Which country is associated/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry previous action' }));
    expect(await screen.findByText(/Second question/)).toBeInTheDocument();
    expect(screen.getByText('A reviewed explanation.')).toBeInTheDocument();
    await waitFor(() => expect(gamesService.submitAction).toHaveBeenCalledTimes(2));

    const firstCall = vi.mocked(gamesService.submitAction).mock.calls[0];
    const retryCall = vi.mocked(gamesService.submitAction).mock.calls[1];
    expect(retryCall[2]).toBe(firstCall[2]);
    expect(retryCall[1]).toEqual({ type: 'answer', questionId: 'question-1', optionId: 'answer-a' });
  });

  it('retains a song guess after a failed save and clears it after a successful retry', async () => {
    const lyricPuzzle = {
      ...dailyGame,
      puzzle: {
        game: 'LYRIC_GENIE' as const,
        level: 8,
        puzzleDate: dailyGame.puzzleDate,
        clues: ['A clue about the song.'],
      },
    };
    vi.mocked(gamesService.getDailyGame).mockResolvedValue(lyricPuzzle);
    vi.mocked(gamesService.createGuestSession).mockResolvedValue({
      ...guestSession,
      play: { ...guestSession.play, state: { guesses: [], attemptsUsed: 0 } },
    });
    vi.mocked(gamesService.submitAction)
      .mockRejectedValueOnce(new Error('Could not save your guess'))
      .mockResolvedValueOnce({
        puzzleDate: dailyGame.puzzleDate,
        play: {
          ...guestSession.play,
          state: { guesses: ['The Song'], attemptsUsed: 1 },
        },
        feedback: { correct: false },
      });

    render(
      <MemoryRouter initialEntries={['/games/lyrics']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = await screen.findByRole('textbox', { name: 'Song title guess' });
    fireEvent.change(input, { target: { value: 'The Song' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guess' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your guess');
    expect(input).toHaveValue('The Song');

    fireEvent.click(screen.getByRole('button', { name: 'Retry previous action' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(gamesService.submitAction).toHaveBeenCalledTimes(2);
  });

  it('ignores a guest-state response that arrives after switching to an account', async () => {
    vi.mocked(gamesService.getGuestToken).mockReturnValue('guest-token');
    const accountPlay = {
      ...guestSession.play,
      state: {
        answers: [{ questionId: 'question-1', optionId: 'answer-a', correct: true }],
        score: 1,
      },
    };
    let resolveGuestState!: (value: { puzzleDate: string; play: typeof guestSession.play }) => void;
    vi.mocked(gamesService.getState).mockImplementation((_gameId, token) => {
      if (token) {
        return new Promise((resolve) => {
          resolveGuestState = resolve;
        });
      }
      return Promise.resolve({ puzzleDate: dailyGame.puzzleDate, play: accountPlay });
    });

    const page = () => (
      <MemoryRouter initialEntries={['/games/daily-beads']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(page());
    await waitFor(() => expect(gamesService.getState).toHaveBeenCalledTimes(1));

    await act(async () => {
      authState.user = { id: 'account-1' };
      rerender(page());
    });
    expect(await screen.findByText(/Second question/)).toBeInTheDocument();

    await act(async () => {
      resolveGuestState({ puzzleDate: dailyGame.puzzleDate, play: guestSession.play });
    });
    expect(screen.getByText(/Second question/)).toBeInTheDocument();
    expect(screen.queryByText(/Which country is associated/)).not.toBeInTheDocument();
  });

  it('does not turn a failed guest-session request into local play', async () => {
    vi.mocked(gamesService.createGuestSession).mockRejectedValueOnce(new Error('Session service unavailable'));
    render(
      <MemoryRouter initialEntries={['/games/daily-beads']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Session service unavailable');
    expect(screen.queryByRole('button', { name: 'Option A' })).not.toBeInTheDocument();
  });

  it('restarts loading when the puzzle date changes between requests', async () => {
    const nextDay = {
      ...dailyGame,
      puzzleDate: '2026-11-05',
      puzzleNumber: dailyGame.puzzleNumber + 1,
      puzzle: {
        ...dailyGame.puzzle,
        puzzleDate: '2026-11-05',
        questions: [{
          id: 'next-question',
          prompt: 'A new day question',
          options: [{ id: 'new-option', label: 'New option' }],
        }],
      },
    };
    vi.mocked(gamesService.getDailyGame)
      .mockResolvedValueOnce(dailyGame)
      .mockResolvedValueOnce(nextDay);
    vi.mocked(gamesService.getGuestToken).mockReturnValue('a'.repeat(43));
    vi.mocked(gamesService.getState).mockResolvedValue({
      puzzleDate: nextDay.puzzleDate,
      play: guestSession.play,
    });

    render(
      <MemoryRouter initialEntries={['/games/daily-beads']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/A new day question/)).toBeInTheDocument();
    expect(gamesService.getDailyGame).toHaveBeenCalledTimes(2);
  });

  it('shows Daily Beads instructions on first visit and lets players reopen them', async () => {
    localStorage.removeItem('afro-genie:games:how-to-play:v1:daily-beads');
    render(
      <MemoryRouter initialEntries={['/games/daily-beads']}>
        <Routes>
          <Route path="/games/:gameId" element={<GamesPlayPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('dialog', { name: '📿 How to play Daily Beads' })).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: 'Close how to play' });
    expect(closeButton).toHaveFocus();
    expect(screen.getByText('Answer five quick questions about African music.')).toBeInTheDocument();
    expect(screen.getByText('Get three or more answers right to win.')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Let’s play' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Let’s play' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('afro-genie:games:how-to-play:v1:daily-beads')).toBe('true');

    const howToButton = screen.getByRole('button', { name: '❓ How to play' });
    howToButton.focus();
    fireEvent.click(howToButton);
    expect(screen.getByRole('dialog', { name: '📿 How to play Daily Beads' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(howToButton).toHaveFocus();
  });
});
