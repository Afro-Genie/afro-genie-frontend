import type { DailyGamePuzzle, GameAction, GameActionResponse, GamePlayState } from '../../types/games';

interface DailyBeadsProps {
  puzzle: DailyGamePuzzle;
  play: GamePlayState;
  feedback?: GameActionResponse['feedback'];
  busy: boolean;
  onAction: (action: GameAction) => Promise<void>;
}

export default function DailyBeads({ puzzle, play, feedback, busy, onAction }: DailyBeadsProps) {
  const questions = puzzle.questions ?? [];
  const state = play.state;
  const answers = Array.isArray(state.answers) ? state.answers : [];
  const index = answers.length;
  const question = questions[index];
  const correctOptionId = typeof feedback?.correctOptionId === 'string' ? feedback.correctOptionId : '';

  return (
    <section aria-labelledby="daily-beads-title" className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Daily Beads</p>
        <h2 id="daily-beads-title" className="mt-2 text-2xl font-bold text-white">African music trivia</h2>
        <p className="mt-2 text-sm text-gray-300">Answer five questions. Three correct answers win the round.</p>
      </header>

      {question && play.status === 'IN_PROGRESS' ? (
        <fieldset disabled={busy} className="space-y-4">
          <legend className="text-lg font-semibold text-white">
            Question {index + 1} of {questions.length}: {question.prompt}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => void onAction({ type: 'answer', questionId: question.id, optionId: option.id })}
                className="min-h-14 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-left text-white transition hover:border-amber-300/60 hover:bg-amber-300/10 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-white">
          {play.won ? 'You earned today’s beads!' : 'Today’s round is complete.'}
          <p className="mt-2">Score: {typeof state.score === 'number' ? state.score : play.score ?? 0} / 5</p>
        </div>
      )}

      {feedback && typeof feedback.correct === 'boolean' && (
        <div role="status" className="rounded-lg bg-white/5 p-4 text-sm text-gray-200">
          <p className="font-semibold">{feedback.correct ? 'Correct answer!' : 'That was not correct.'}</p>
          {typeof feedback.explanation === 'string' && <p className="mt-1">{feedback.explanation}</p>}
          {correctOptionId && (
            <p className="mt-1">
              Correct option: {questions.find((item) => item.id === feedback.questionId)?.options.find((option) => option.id === correctOptionId)?.label ?? 'Answer recorded'}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-gray-400">Correct so far: {typeof state.score === 'number' ? state.score : 0}</p>
    </section>
  );
}
