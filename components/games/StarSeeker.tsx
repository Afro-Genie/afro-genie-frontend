import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DailyGamePuzzle, GameAction, GameActionResponse, GamePlayState } from '../../types/games';

interface StarSeekerProps {
  puzzle: DailyGamePuzzle;
  play: GamePlayState;
  feedback?: GameActionResponse['feedback'];
  busy: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

interface GuessFeedback {
  artistId: string;
  correct: boolean;
  comparison: Record<string, string> | null;
}

const asGuessFeedback = (value: unknown): GuessFeedback[] =>
  Array.isArray(value)
    ? value.filter((item): item is GuessFeedback =>
        typeof item === 'object' && item !== null &&
        'artistId' in item && typeof item.artistId === 'string' &&
        'correct' in item && typeof item.correct === 'boolean',
      )
    : [];

const labels: Record<string, string> = {
  country: 'Country',
  region: 'Region',
  genre: 'Genre',
  debut: 'Debut',
  gender: 'Gender',
  size: 'Career size',
};

export default function StarSeeker({ puzzle, play, feedback, busy, onAction }: StarSeekerProps) {
  const [artistName, setArtistName] = useState('');
  const [guessError, setGuessError] = useState('');
  const state = play.state;
  const candidates = puzzle.candidates ?? [];
  const guesses = Array.isArray(state.guesses) ? state.guesses : [];
  const previousGuessCount = useRef(guesses.length);
  const guessFeedback = asGuessFeedback(state.guessFeedback);
  const hints = Array.isArray(state.hints) ? state.hints.filter((hint): hint is string => typeof hint === 'string') : [];
  const active = play.status === 'IN_PROGRESS';

  useEffect(() => {
    if (guesses.length !== previousGuessCount.current) {
      setArtistName('');
      setGuessError('');
    }
    previousGuessCount.current = guesses.length;
  }, [guesses.length]);

  const submitGuess = async (event: FormEvent) => {
    event.preventDefault();
    const guess = artistName.trim();
    if (!guess || !active || busy) return;
    const candidate = candidates.find(({ name }) => name.toLowerCase() === guess.toLowerCase());
    if (!candidate) {
      setGuessError('Enter an artist from today’s game.');
      return;
    }
    setGuessError('');
    await onAction({ type: 'guess', artistId: candidate.artistId });
  };

  return (
    <section aria-labelledby="star-seeker-title" className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Star Seeker</p>
        <h2 id="star-seeker-title" className="mt-2 text-2xl font-bold text-white">Find the artist</h2>
        <p className="mt-2 text-sm text-gray-300">Type an artist’s name as your answer (there’s no dropdown). Compare attributes, use up to three hints, and solve it in ten guesses.</p>
      </header>

      {active ? (
        <form onSubmit={submitGuess} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="artist-guess" className="sr-only">Artist name guess</label>
          <input
            id="artist-guess"
            autoComplete="off"
            value={artistName}
            onChange={(event) => {
              setArtistName(event.target.value);
              setGuessError('');
            }}
            placeholder="Type an artist name"
            className="min-h-12 flex-1 rounded-lg border border-white/15 bg-[#0f1b14] px-4 text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          />
          <button type="submit" disabled={busy || !artistName.trim()} className="min-h-12 rounded-lg bg-sky-400 px-6 font-semibold text-[#102017] hover:bg-sky-300 disabled:opacity-50">
            Guess
          </button>
          <button
            type="button"
            disabled={busy || hints.length >= 3}
            onClick={() => void onAction({ type: 'hint' })}
            className="min-h-12 rounded-lg border border-white/15 px-5 font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            Reveal a hint ({Math.max(0, 3 - hints.length)} left)
          </button>
        </form>
      ) : (
        <div role="status" className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-white">
          {play.won ? 'You found today’s artist!' : 'Today’s round is complete.'}
          {typeof state.answer === 'string' && <p className="mt-2 font-semibold">{state.answer}</p>}
        </div>
      )}
      {guessError && <p role="alert" className="text-sm text-rose-300">{guessError}</p>}

      {hints.length > 0 && (
        <ul aria-label="Revealed hints" className="space-y-2">
          {hints.map((hint, index) => <li key={`${index}-${hint}`} className="rounded-lg bg-white/5 p-3 text-sm text-gray-200">Hint {index + 1}: {hint}</li>)}
        </ul>
      )}

      {guessFeedback.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white">Guess comparisons</h3>
          {guessFeedback.map((guess) => {
            const name = candidates.find((candidate) => candidate.artistId === guess.artistId)?.name ?? 'Artist';
            return (
              <div key={guess.artistId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">{name}</p>
                {guess.comparison && (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {Object.entries(guess.comparison).map(([key, value]) => (
                      <div key={key} className="rounded bg-black/20 p-2">
                        <dt className="text-gray-400">{labels[key] ?? key}</dt>
                        <dd className="font-semibold text-gray-100">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedback && typeof feedback.hint === 'string' && (
        <p role="status" className="text-sm text-gray-200">Hint added: {feedback.hint}</p>
      )}
      <p className="text-sm text-gray-400">Guesses used: {guesses.length} / 10</p>
    </section>
  );
}
