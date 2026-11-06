import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DailyGamePuzzle, GameAction, GameActionResponse, GamePlayState } from '../../types/games';

interface LyricGenieProps {
  puzzle: DailyGamePuzzle;
  play: GamePlayState;
  feedback?: GameActionResponse['feedback'];
  busy: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export default function LyricGenie({ puzzle, play, feedback, busy, onAction }: LyricGenieProps) {
  const [guess, setGuess] = useState('');
  const state = play.state;
  const clues = stringArray(state.revealedClues ?? puzzle.clues);
  const guesses = stringArray(state.guesses);
  const previousGuessCount = useRef(guesses.length);
  const active = play.status === 'IN_PROGRESS';

  useEffect(() => {
    if (guesses.length !== previousGuessCount.current) setGuess('');
    previousGuessCount.current = guesses.length;
  }, [guesses.length]);

  const submitGuess = async (event: FormEvent) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value || !active || busy) return;
    await onAction({ type: 'guess', value });
  };

  return (
    <section aria-labelledby="lyric-genie-title" className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Lyric Genie</p>
        <h2 id="lyric-genie-title" className="mt-2 text-2xl font-bold text-white">Name that song</h2>
        <p className="mt-2 text-sm text-gray-300">Use each factual clue to identify the song. You have six attempts.</p>
      </header>

      <ol aria-label="Revealed clues" className="space-y-3">
        {clues.map((clue, index) => (
          <li key={`${index}-${clue}`} className="rounded-xl border border-white/10 bg-white/5 p-4 text-gray-100">
            <span className="mr-3 text-xs font-bold uppercase text-emerald-300">Clue {index + 1}</span>
            {clue}
          </li>
        ))}
      </ol>

      {active ? (
        <form onSubmit={submitGuess} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="lyric-guess" className="sr-only">Song title guess</label>
          <input
            id="lyric-guess"
            autoComplete="off"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            placeholder="Type a song title"
            className="min-h-12 flex-1 rounded-lg border border-white/15 bg-[#0f1b14] px-4 text-white placeholder:text-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
          <button
            type="submit"
            disabled={busy || !guess.trim()}
            className="min-h-12 rounded-lg bg-emerald-500 px-6 font-semibold text-[#102017] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guess
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onAction({ type: 'skip' })}
            className="min-h-12 rounded-lg border border-white/15 px-5 font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            Skip
          </button>
        </form>
      ) : (
        <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-white">
          {play.won ? 'You solved today’s song!' : 'Today’s round is complete.'}
          {typeof state.answerTitle === 'string' && <p className="mt-2 font-semibold">{state.answerTitle}</p>}
          {typeof state.artist === 'string' && <p className="text-sm text-gray-300">{state.artist}</p>}
        </div>
      )}

      {feedback && typeof feedback.correct === 'boolean' && (
        <p role="status" className="text-sm text-gray-200">
          {feedback.correct ? 'Correct!' : 'Not quite. A new clue is ready.'}
        </p>
      )}
      <p className="text-sm text-gray-400">Attempts used: {typeof state.attemptsUsed === 'number' ? state.attemptsUsed : guesses.length} / 6</p>
    </section>
  );
}
