import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DailyBeads from '../components/games/DailyBeads';
import LyricGenie from '../components/games/LyricGenie';
import RhythmGroups from '../components/games/RhythmGroups';
import StarSeeker from '../components/games/StarSeeker';
import type { DailyGamePuzzle, GamePlayState } from '../types/games';

const activePlay: GamePlayState = {
  playId: 'play-1',
  status: 'IN_PROGRESS',
  state: {},
  won: null,
  score: null,
  completedAt: null,
};

describe('game interaction components', () => {
  it('submits Lyric Genie guesses with Enter through its accessible form', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const puzzle: DailyGamePuzzle = {
      game: 'LYRIC_GENIE',
      level: 1,
      puzzleDate: '2026-11-04',
      clues: ['A clue about the song.'],
    };

    render(<LyricGenie puzzle={puzzle} play={activePlay} busy={false} onAction={onAction} />);

    const input = screen.getByRole('textbox', { name: 'Song title guess' });
    expect(screen.getByRole('list', { name: 'Revealed clues' })).toBeInTheDocument();
    expect(input.closest('form')).toHaveClass('sm:flex-row');
    await user.type(input, 'The Song{Enter}');

    expect(onAction).toHaveBeenCalledWith({ type: 'guess', value: 'The Song' });
  });

  it('submits typed Star Seeker artist names from the keyboard', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const puzzle: DailyGamePuzzle = {
      game: 'STAR_SEEKER',
      level: 1,
      puzzleDate: '2026-11-04',
      candidates: [{ artistId: 'artist-1', name: 'Artist One' }],
    };

    render(<StarSeeker puzzle={puzzle} play={activePlay} busy={false} onAction={onAction} />);

    const input = screen.getByRole('textbox', { name: 'Artist name guess' });
    expect(input.closest('form')).toHaveClass('sm:flex-row');
    await user.type(input, ' artist one {Enter}');

    expect(onAction).toHaveBeenCalledWith({ type: 'guess', artistId: 'artist-1' });
    expect(screen.getByRole('button', { name: /Reveal a hint/ })).toBeEnabled();
  });

  it('shows an error when a typed Star Seeker artist is not in the game', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const puzzle: DailyGamePuzzle = {
      game: 'STAR_SEEKER',
      level: 1,
      puzzleDate: '2026-11-04',
      candidates: [{ artistId: 'artist-1', name: 'Artist One' }],
    };

    render(<StarSeeker puzzle={puzzle} play={activePlay} busy={false} onAction={onAction} />);
    await user.type(screen.getByRole('textbox', { name: 'Artist name guess' }), 'Unknown Artist{Enter}');

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an artist from today’s game.');
  });

  it('supports keyboard selection and responsive layout for Rhythm Groups tiles', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const puzzle: DailyGamePuzzle = {
      game: 'RHYTHM_GROUPS',
      level: 1,
      puzzleDate: '2026-11-04',
      tiles: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'],
    };

    render(<RhythmGroups puzzle={puzzle} play={activePlay} busy={false} onAction={onAction} />);

    const tileGroup = screen.getByRole('group', { name: 'Rhythm Groups tiles' });
    expect(tileGroup).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
    const tiles = ['A', 'B', 'C', 'D'].map((tile) => screen.getByRole('button', { name: tile }));
    tiles.forEach((tile) => expect(tile.tagName).toBe('BUTTON'));
    tiles[0].focus();
    await user.keyboard(' ');
    expect(tiles[0]).toHaveAttribute('aria-pressed', 'true');
    tiles.slice(1).forEach((tile) => fireEvent.click(tile));
    fireEvent.click(screen.getByRole('button', { name: 'Submit group (4/4)' }));

    expect(onAction).toHaveBeenCalledWith({ type: 'submit-group', items: ['A', 'B', 'C', 'D'] });
  });

  it('submits Daily Beads answers with Enter using accessible option buttons', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn().mockResolvedValue(undefined);
    const puzzle: DailyGamePuzzle = {
      game: 'DAILY_BEADS',
      level: 1,
      puzzleDate: '2026-11-04',
      questions: [{
        id: 'question-1',
        prompt: 'Which country is associated with this music fact?',
        options: [{ id: 'answer-1', label: 'Option One' }],
      }],
    };

    render(<DailyBeads puzzle={puzzle} play={activePlay} busy={false} onAction={onAction} />);
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onAction).toHaveBeenCalledWith({
      type: 'answer',
      questionId: 'question-1',
      optionId: 'answer-1',
    });
    expect(screen.getByRole('button', { name: 'Option One' })).toBeEnabled();
  });
});
