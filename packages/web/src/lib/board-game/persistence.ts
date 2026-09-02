import type { GameState } from './state';

const KEY_PREFIX = 'clawix_boardgame_';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${state.definitionId}`, JSON.stringify(state));
  } catch {
    // storage unavailable — silently skip
  }
}

export function loadGame(definitionId: string): GameState | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${definitionId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearGame(definitionId: string): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${definitionId}`);
  } catch {
    // no-op
  }
}
