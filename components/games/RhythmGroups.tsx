import { useEffect, useRef, useState } from 'react';
import type { DailyGamePuzzle, GameAction, GameActionResponse, GamePlayState } from '../../types/games';

interface RhythmGroupsProps {
  puzzle: DailyGamePuzzle;
  play: GamePlayState;
  feedback?: GameActionResponse['feedback'];
  busy: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

interface SolvedGroup {
  id: string;
  label: string;
  items: string[];
}

const groupsFrom = (value: unknown): SolvedGroup[] =>
  Array.isArray(value)
    ? value.filter((group): group is SolvedGroup =>
        typeof group === 'object' && group !== null &&
        'id' in group && typeof group.id === 'string' &&
        'label' in group && typeof group.label === 'string' &&
        'items' in group && Array.isArray(group.items),
      )
    : [];

export default function RhythmGroups({ puzzle, play, feedback, busy, onAction }: RhythmGroupsProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const tiles = puzzle.tiles ?? [];
  const state = play.state;
  const solvedGroups = groupsFrom(state.solvedGroups);
  const solvedItems = new Set(solvedGroups.flatMap((group) => group.items));
  const mistakes = typeof state.mistakes === 'number' ? state.mistakes : 0;
  const progressKey = `${mistakes}:${solvedGroups.length}`;
  const previousProgress = useRef(progressKey);
  const active = play.status === 'IN_PROGRESS';

  useEffect(() => {
    if (progressKey !== previousProgress.current) setSelected([]);
    previousProgress.current = progressKey;
  }, [progressKey]);

  const toggleTile = (tile: string) => {
    if (!active || busy || solvedItems.has(tile)) return;
    setSelected((current) =>
      current.includes(tile)
        ? current.filter((item) => item !== tile)
        : current.length < 4 ? [...current, tile] : current,
    );
  };

  const submitGroup = async () => {
    if (selected.length !== 4 || busy || !active) return;
    await onAction({ type: 'submit-group', items: selected });
  };

  return (
    <section aria-labelledby="rhythm-groups-title" className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">Rhythm Groups</p>
        <h2 id="rhythm-groups-title" className="mt-2 text-2xl font-bold text-white">Find the connections</h2>
        <p className="mt-2 text-sm text-gray-300">Sort all sixteen tiles into four groups. Four mistakes are allowed.</p>
      </header>

      {solvedGroups.length > 0 && (
        <ul aria-label="Solved groups" className="space-y-2">
          {solvedGroups.map((group) => (
            <li key={group.id} className="rounded-lg border border-violet-300/30 bg-violet-300/10 p-3">
              <p className="font-semibold text-white">{group.label}</p>
              <p className="mt-1 text-sm text-gray-300">{group.items.join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <>
          <div role="group" aria-label="Rhythm Groups tiles" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.filter((tile) => !solvedItems.has(tile)).map((tile) => {
              const isSelected = selected.includes(tile);
              return (
                <button
                  type="button"
                  key={tile}
                  aria-pressed={isSelected}
                  onClick={() => toggleTile(tile)}
                  disabled={busy}
                  className={`min-h-16 rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-60 ${isSelected ? 'border-violet-300 bg-violet-300 text-[#162119]' : 'border-white/15 bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {tile}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setSelected([])} disabled={busy || selected.length === 0} className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50">
              Clear selection
            </button>
            <button type="button" onClick={() => void submitGroup()} disabled={busy || selected.length !== 4} className="min-h-11 rounded-lg bg-violet-300 px-5 font-semibold text-[#162119] hover:bg-violet-200 disabled:opacity-50">
              Submit group ({selected.length}/4)
            </button>
            <span className="text-sm text-gray-400">Mistakes: {mistakes} / 4</span>
          </div>
        </>
      ) : (
        <div role="status" className="rounded-xl border border-violet-300/30 bg-violet-300/10 p-4 text-white">
          {play.won ? 'All four groups solved!' : 'Today’s board is complete.'}
          {Array.isArray(state.groups) && groupsFrom(state.groups).map((group) => (
            <p key={group.id} className="mt-2 text-sm">{group.label}: {group.items.join(', ')}</p>
          ))}
        </div>
      )}

      {feedback && typeof feedback.correct === 'boolean' && (
        <p role="status" className="text-sm text-gray-200">{feedback.correct ? 'Group found!' : 'Not a group. Try another combination.'}</p>
      )}
    </section>
  );
}
