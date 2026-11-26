import { apiRequest } from './api';
import type {
  DailyGameResponse,
  DailyGameProgressResponse,
  DailyGamesManifest,
  GameAction,
  GameActionResponse,
  GameId,
  GameStateResponse,
  GuestGameSession,
} from '../types/games';

const guestSessionKey = (gameId: GameId, puzzleDate: string) =>
  `afro-genie:games:v1:${gameId}:${puzzleDate}`;

export const gamesService = {
  getDailyManifest: () => apiRequest<DailyGamesManifest>('/games/daily'),

  getDailyGame: (gameId: GameId) =>
    apiRequest<DailyGameResponse>(`/games/daily/${gameId}`),

  getDailyProgress: (guestTokens?: Partial<Record<GameId, string>>) =>
    apiRequest<DailyGameProgressResponse>('/games/progress', {
      method: 'POST',
      body: JSON.stringify(guestTokens ? { guestTokens } : {}),
    }),

  getState: (gameId: GameId, guestToken?: string) =>
    apiRequest<GameStateResponse>(`/games/${gameId}/state`, {
      headers: guestToken ? { 'x-game-session': guestToken } : undefined,
    }),

  createGuestSession: (gameId: GameId) =>
    apiRequest<GuestGameSession>(`/games/${gameId}/session`, { method: 'POST' }),

  saveGuestToken: (gameId: GameId, puzzleDate: string, token: string) =>
    localStorage.setItem(guestSessionKey(gameId, puzzleDate), token),

  clearGuestToken: (gameId: GameId, puzzleDate: string) =>
    localStorage.removeItem(guestSessionKey(gameId, puzzleDate)),

  getGuestToken: (gameId: GameId, puzzleDate: string) =>
    localStorage.getItem(guestSessionKey(gameId, puzzleDate)),

  submitAction: (
    gameId: GameId,
    action: GameAction,
    idempotencyKey: string,
    guestToken?: string,
  ) =>
    apiRequest<GameActionResponse>(`/games/${gameId}/actions`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
        ...(guestToken ? { 'x-game-session': guestToken } : {}),
      },
      body: JSON.stringify(action),
    }),
};
