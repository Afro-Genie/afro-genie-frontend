export type GameId = 'lyrics' | 'star-seeker' | 'rhythm-groups' | 'daily-beads';
export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST' | 'COMPLETED';

export interface GameMetadata {
  id: GameId;
  name: string;
  description: string;
  attemptLimit: number;
}

export interface DailyGamesManifest {
  puzzleDate: string;
  puzzleNumber: number;
  level: number;
  resetsAt: string;
  games: GameMetadata[];
}

export interface DailyGamePuzzle {
  game: 'LYRIC_GENIE' | 'STAR_SEEKER' | 'RHYTHM_GROUPS' | 'DAILY_BEADS';
  level: number;
  puzzleDate: string;
  clueCount?: number;
  attemptLimit?: number;
  hintLimit?: number;
  clues?: string[];
  candidates?: Array<{ artistId: string; name: string }>;
  tiles?: string[];
  groupCount?: number;
  mistakesAllowed?: number;
  questions?: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
  questionCount?: number;
  winThreshold?: number;
}

export interface DailyGameResponse {
  puzzleDate: string;
  puzzleNumber: number;
  level: number;
  resetsAt: string;
  puzzle: DailyGamePuzzle;
}

export interface GamePlayState {
  playId: string;
  status: GameStatus;
  state: Record<string, unknown>;
  won: boolean | null;
  score: number | null;
  completedAt: string | null;
}

export interface GameStateResponse {
  puzzleDate: string;
  play: GamePlayState;
}

export interface DailyGameProgressResponse {
  puzzleDate: string;
  statuses: Partial<Record<GameId, GameStatus>>;
}

export interface GameActionResponse extends GameStateResponse {
  feedback: Record<string, unknown>;
}

export interface GuestGameSession extends GameStateResponse {
  token: string;
  expiresAt: string;
}

export type GameAction =
  | { type: 'guess'; value: string }
  | { type: 'skip' }
  | { type: 'guess'; artistId: string }
  | { type: 'hint' }
  | { type: 'submit-group'; items: string[] }
  | { type: 'answer'; questionId: string; optionId: string };
