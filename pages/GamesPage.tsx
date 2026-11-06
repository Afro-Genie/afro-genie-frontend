import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gamesService } from '../services/gamesService';
import type { DailyGamesManifest, GameId, GameStatus } from '../types/games';

const gameStyles: Record<GameId, { accent: string; tag: string }> = {
  lyrics: { accent: 'border-emerald-400/40 hover:border-emerald-300', tag: 'text-emerald-300' },
  'star-seeker': { accent: 'border-sky-400/40 hover:border-sky-300', tag: 'text-sky-300' },
  'rhythm-groups': { accent: 'border-violet-300/40 hover:border-violet-200', tag: 'text-violet-200' },
  'daily-beads': { accent: 'border-amber-300/40 hover:border-amber-200', tag: 'text-amber-200' },
};

const statusLabel: Record<GameStatus, string> = {
  IN_PROGRESS: 'In progress',
  WON: 'Completed · won',
  LOST: 'Completed',
  COMPLETED: 'Completed',
};

const GamesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const identityKey = user ? `account:${user.id}` : 'guest';
  const [manifest, setManifest] = useState<DailyGamesManifest | null>(null);
  const [statuses, setStatuses] = useState<Partial<Record<GameId, GameStatus>>>({});
  const [statusOwner, setStatusOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadGames = useCallback(async () => {
    if (authLoading) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    setManifest(null);
    setStatuses({});
    setStatusOwner(null);
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const daily = await gamesService.getDailyManifest();
        if (requestId !== requestSequence.current) return;

        const guestTokens = user ? undefined : Object.fromEntries(
          daily.games.flatMap((game) => {
            const token = gamesService.getGuestToken(game.id, daily.puzzleDate);
            return token ? [[game.id, token]] : [];
          }),
        ) as Partial<Record<GameId, string>>;
        const progress = await gamesService.getDailyProgress(guestTokens);
        if (requestId !== requestSequence.current) return;
        if (progress.puzzleDate !== daily.puzzleDate) continue;

        setManifest(daily);
        setStatuses(progress.statuses);
        setStatusOwner(identityKey);
        return;
      }
      throw new Error('The daily puzzle changed while loading. Please retry.');
    } catch (loadError) {
      if (requestId !== requestSequence.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load today’s games.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [authLoading, identityKey, user]);

  useEffect(() => {
    if (!authLoading) void loadGames();
    return () => {
      requestSequence.current += 1;
    };
  }, [authLoading, loadGames]);

  const visibleStatuses = statusOwner === identityKey ? statuses : {};

  return (
    <div className="min-h-screen bg-[#122118] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Afro Genie Games</p>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">Play today’s music games</h1>
            <p className="mt-3 max-w-2xl text-gray-300">Four daily challenges celebrating African music. Your progress is saved to your account or this browser session.</p>
          </div>
          {manifest && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
              <span className="block text-xs uppercase tracking-wider text-gray-500">Puzzle {manifest.puzzleNumber}</span>
              <time dateTime={manifest.puzzleDate} className="mt-1 block font-semibold text-white">{manifest.puzzleDate} · UTC</time>
            </div>
          )}
        </div>

        {loading && !manifest && (
          <div role="status" className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
            Loading today’s games…
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-100">
            <p>{error}</p>
            <button type="button" onClick={() => void loadGames()} className="mt-3 min-h-11 rounded-lg border border-red-200/30 px-4 font-semibold hover:bg-red-100/10">
              Retry
            </button>
          </div>
        )}

        {manifest && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {manifest.games.map((game) => {
                const style = gameStyles[game.id];
                const status = visibleStatuses[game.id];
                return (
                  <article key={game.id} className={`flex min-h-56 flex-col rounded-2xl border bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 transition ${style.accent}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${style.tag}`}>Daily challenge</p>
                        <h2 className="mt-3 text-2xl font-bold">{game.name}</h2>
                      </div>
                      <span aria-hidden="true" className="text-3xl">
                        {game.id === 'lyrics' ? '♫' : game.id === 'star-seeker' ? '✦' : game.id === 'rhythm-groups' ? '▦' : '◉'}
                      </span>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-6 text-gray-300">{game.description}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="text-xs text-gray-400">
                        {status ? statusLabel[status] : `${game.attemptLimit} attempts`}
                      </span>
                      <Link
                        to={`/games/${game.id}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 font-semibold text-[#142219] transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      >
                        {status ? 'Continue' : 'Play now'}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">Puzzles reset daily at 00:00 UTC.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default GamesPage;
