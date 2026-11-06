import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DailyBeads from '../components/games/DailyBeads';
import LyricGenie from '../components/games/LyricGenie';
import RhythmGroups from '../components/games/RhythmGroups';
import StarSeeker from '../components/games/StarSeeker';
import { gamesService } from '../services/gamesService';
import type {
  DailyGameResponse,
  GameAction,
  GameActionResponse,
  GameId,
  GamePlayState,
} from '../types/games';

const GAME_IDS: GameId[] = ['lyrics', 'star-seeker', 'rhythm-groups', 'daily-beads'];

const HOW_TO_PLAY: Record<GameId, {
  name: string;
  icon: string;
  lead: string;
  steps: string[];
  tip: string;
}> = {
  lyrics: {
    name: 'Lyric Genie',
    icon: '🎵',
    lead: "Guess today's African hit song in six tries.",
    steps: [
      'Start with one clue about the song.',
      'Type the song title and press Guess.',
      'Every wrong guess or Skip unlocks another clue.',
      'Use the clues to identify the song before your attempts run out.',
    ],
    tip: 'The fewer clues you need, the better your score.',
  },
  'star-seeker': {
    name: 'Star Seeker',
    icon: '⭐',
    lead: "Find today's mystery African artist in ten guesses.",
    steps: [
      'Choose an artist from the list and press Guess.',
      'MATCH means the attribute is the same; NO MATCH means it is different.',
      'For debut year and career size, EARLIER or LOWER means your guess is below the mystery artist; LATER or HIGHER means it is above.',
      'Reveal up to three hints if you get stuck.',
    ],
    tip: 'Compare each artist attribute to narrow down the mystery artist.',
  },
  'rhythm-groups': {
    name: 'Rhythm Groups',
    icon: '🥁',
    lead: 'Sort sixteen tiles into four hidden groups of four.',
    steps: [
      'Each tile belongs to exactly one group, such as songs by an artist or artists from a country.',
      'Select four tiles you think belong together, then press Submit group.',
      'A correct group is revealed and removed from the board.',
      'You can make four mistakes before the round ends.',
    ],
    tip: 'Watch for red herrings: some tiles may look like they fit more than one group.',
  },
  'daily-beads': {
    name: 'Daily Beads',
    icon: '📿',
    lead: 'Answer five quick questions about African music.',
    steps: [
      'Choose one answer for each question.',
      'After each answer, see whether it was correct and read a music fact.',
      'Answer all five questions to finish the round.',
      'Get three or more answers right to win.',
    ],
    tip: 'A perfect string of five correct answers is the goal.',
  },
};

interface PendingAction {
  action: GameAction;
  idempotencyKey: string;
}

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const GamesPlayPage: React.FC = () => {
  const { gameId: routeGameId } = useParams<{ gameId: string }>();
  const { user, loading: authLoading } = useAuth();
  const gameId = routeGameId && GAME_IDS.includes(routeGameId as GameId) ? routeGameId as GameId : null;
  const identityKey = user ? `account:${user.id}` : 'guest';
  const ownerKey = `${identityKey}:${gameId ?? ''}`;
  const [daily, setDaily] = useState<DailyGameResponse | null>(null);
  const [play, setPlay] = useState<GamePlayState | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<GameActionResponse['feedback']>();
  const [guestToken, setGuestToken] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [howToOpen, setHowToOpen] = useState(false);
  const pendingAction = useRef<PendingAction | null>(null);
  const loadSequence = useRef(0);
  const howToDialogRef = useRef<HTMLElement>(null);
  const howToCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!gameId) return;
    const seenKey = `afro-genie:games:how-to-play:v1:${gameId}`;
    setHowToOpen(localStorage.getItem(seenKey) !== 'true');
  }, [gameId]);

  const closeHowTo = useCallback(() => {
    if (gameId) {
      localStorage.setItem(`afro-genie:games:how-to-play:v1:${gameId}`, 'true');
    }
    setHowToOpen(false);
  }, [gameId]);

  useEffect(() => {
    if (!howToOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeHowTo();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = howToDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    howToCloseButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [closeHowTo, howToOpen]);

  const loadGame = useCallback(async () => {
    if (!gameId || authLoading) return;
    const requestId = ++loadSequence.current;
    setLoading(true);
    setActionLoading(false);
    setLoadError(null);
    setActionError(null);
    setDaily(null);
    setPlay(null);
    setLoadedOwner(null);
    setFeedback(undefined);
    setGuestToken(undefined);
    pendingAction.current = null;
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const game = await gamesService.getDailyGame(gameId);
        if (requestId !== loadSequence.current) return;

        let nextPlay: GamePlayState;
        let token: string | undefined;
        if (user) {
          const state = await gamesService.getState(gameId);
          if (requestId !== loadSequence.current) return;
          if (state.puzzleDate !== game.puzzleDate) continue;
          nextPlay = state.play;
        } else {
          token = gamesService.getGuestToken(gameId, game.puzzleDate) ?? undefined;
          if (token) {
            try {
              const state = await gamesService.getState(gameId, token);
              if (requestId !== loadSequence.current) return;
              if (state.puzzleDate !== game.puzzleDate) continue;
              nextPlay = state.play;
            } catch (stateError) {
              if (requestId !== loadSequence.current) return;
              if (typeof stateError !== 'object' || stateError === null || !('status' in stateError) || stateError.status !== 401) {
                throw stateError;
              }
              gamesService.clearGuestToken(gameId, game.puzzleDate);
              token = undefined;
            }
          }
          if (!token) {
            const session = await gamesService.createGuestSession(gameId);
            if (requestId !== loadSequence.current) return;
            if (session.puzzleDate !== game.puzzleDate) {
              gamesService.saveGuestToken(gameId, session.puzzleDate, session.token);
              continue;
            }
            token = session.token;
            gamesService.saveGuestToken(gameId, session.puzzleDate, token);
            nextPlay = session.play;
          }
        }

        setDaily(game);
        setPlay(nextPlay);
        setGuestToken(token);
        setLoadedOwner(ownerKey);
        return;
      }
      throw new Error('The daily puzzle changed while loading. Please retry.');
    } catch (loadError) {
      if (requestId !== loadSequence.current) return;
      setLoadError(loadError instanceof Error ? loadError.message : 'Could not load this game.');
    } finally {
      if (requestId === loadSequence.current) setLoading(false);
    }
  }, [authLoading, gameId, ownerKey, user]);

  useEffect(() => {
    if (!authLoading && gameId) void loadGame();
    return () => {
      loadSequence.current += 1;
    };
  }, [authLoading, gameId, loadGame]);

  const sendAction = useCallback(async (pending: PendingAction) => {
    if (!gameId || pendingAction.current !== pending) return;
    const requestId = loadSequence.current;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await gamesService.submitAction(
        gameId,
        pending.action,
        pending.idempotencyKey,
        user ? undefined : guestToken,
      );
      if (requestId !== loadSequence.current || pendingAction.current !== pending) return;
      pendingAction.current = null;
      setPlay(result.play);
      setFeedback(result.feedback);
    } catch (error) {
      if (requestId !== loadSequence.current || pendingAction.current !== pending) return;
      setActionError(error instanceof Error ? error.message : 'Your action was not saved.');
    } finally {
      if (requestId === loadSequence.current) setActionLoading(false);
    }
  }, [gameId, guestToken, user]);

  const handleAction = useCallback(async (action: GameAction) => {
    if (pendingAction.current) return;
    const pending = { action, idempotencyKey: createIdempotencyKey() };
    pendingAction.current = pending;
    await sendAction(pending);
  }, [sendAction]);

  const retryAction = () => {
    if (pendingAction.current) void sendAction(pendingAction.current);
  };

  const shareResult = async () => {
    if (!daily || !play || play.status === 'IN_PROGRESS') return;
    const gameName = daily.puzzle.game === 'LYRIC_GENIE' ? 'Lyric Genie'
      : daily.puzzle.game === 'STAR_SEEKER' ? 'Star Seeker'
        : daily.puzzle.game === 'RHYTHM_GROUPS' ? 'Rhythm Groups' : 'Daily Beads';
    const result = play.won ? 'won' : 'completed';
    const score = play.score === null ? '' : ` Score: ${play.score}.`;
    const message = `I ${result} ${gameName} on Afro Genie today (${daily.puzzleDate}).${score}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${gameName} · Afro Genie`, text: message });
        setShareMessage('Share sheet opened.');
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error('Sharing and clipboard are unavailable in this browser.');
      await navigator.clipboard.writeText(message);
      setShareMessage('Result copied to clipboard.');
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') return;
      setShareMessage(shareError instanceof Error ? shareError.message : 'Could not share this result.');
    }
  };

  if (!gameId) return <Navigate to="/games" replace />;
  const busy = actionLoading || pendingAction.current !== null;
  const howTo = HOW_TO_PLAY[gameId];
  const playComponentProps = loadedOwner === ownerKey && daily && play
    ? { puzzle: daily.puzzle, play, feedback, busy, onAction: handleAction }
    : null;

  return (
    <div className="min-h-screen bg-[#122118] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link to="/games" className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-300 hover:text-emerald-200 focus:outline-none focus:underline">
          ← All games
        </Link>
        <button
          type="button"
          onClick={() => setHowToOpen(true)}
          className="ml-4 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          ❓ How to play
        </button>

        {loading && (
          <div role="status" className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
            Loading today’s puzzle…
          </div>
        )}

        {loadError && (
          <div role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-5 text-red-100">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadGame()} className="mt-3 min-h-11 rounded-lg border border-red-200/30 px-4 font-semibold hover:bg-red-100/10">
              Retry
            </button>
          </div>
        )}

        {daily && play && playComponentProps && (
          <article className="mt-5 rounded-2xl border border-white/10 bg-[#1a2b22] p-5 shadow-xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-4 text-xs text-gray-400">
              <span>Puzzle {daily.puzzleNumber}</span>
              <time dateTime={daily.puzzleDate}>{daily.puzzleDate} · UTC</time>
            </div>

            {daily.puzzle.game === 'LYRIC_GENIE' && <LyricGenie key={`${ownerKey}:${daily.puzzleDate}`} {...playComponentProps} />}
            {daily.puzzle.game === 'STAR_SEEKER' && <StarSeeker key={`${ownerKey}:${daily.puzzleDate}`} {...playComponentProps} />}
            {daily.puzzle.game === 'RHYTHM_GROUPS' && <RhythmGroups key={`${ownerKey}:${daily.puzzleDate}`} {...playComponentProps} />}
            {daily.puzzle.game === 'DAILY_BEADS' && <DailyBeads key={`${ownerKey}:${daily.puzzleDate}`} {...playComponentProps} />}

            {actionError && (
              <div role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
                <p>{actionError}</p>
                <button type="button" onClick={retryAction} disabled={actionLoading} className="mt-3 min-h-10 rounded-md border border-red-200/30 px-4 font-semibold hover:bg-red-100/10 disabled:opacity-50">
                  Retry previous action
                </button>
              </div>
            )}

            {play.status !== 'IN_PROGRESS' && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <button type="button" onClick={() => void shareResult()} className="min-h-11 rounded-lg border border-white/15 px-5 font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300">
                  Share result
                </button>
                {shareMessage && <p role="status" className="mt-2 text-sm text-gray-300">{shareMessage}</p>}
              </div>
            )}
          </article>
        )}
      </div>
      {howToOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeHowTo();
          }}
        >
          <section
            ref={howToDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-to-play-title"
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#1a2b22] p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="how-to-play-title" className="text-2xl font-bold text-white">
                {howTo.icon} How to play {howTo.name}
              </h2>
              <button
                type="button"
                ref={howToCloseButtonRef}
                aria-label="Close how to play"
                onClick={closeHowTo}
                className="min-h-11 min-w-11 rounded-lg border border-white/15 text-xl text-gray-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-lg text-emerald-100">{howTo.lead}</p>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-200">
              {howTo.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50">
              💡 {howTo.tip}
            </p>
            <p className="mt-4 text-sm text-gray-300">
              📅 A new puzzle arrives daily at 00:00 UTC. Your result is saved for this browser or account.
            </p>
            <button
              type="button"
              onClick={closeHowTo}
              className="mt-6 min-h-12 w-full rounded-lg bg-emerald-400 px-5 font-semibold text-[#102017] hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Let’s play
            </button>
          </section>
        </div>
      )}
    </div>
  );
};

export default GamesPlayPage;
