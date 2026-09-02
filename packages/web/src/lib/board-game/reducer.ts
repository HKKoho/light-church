import type { GameDefinition, GameCard } from './types';
import type { GameState, PlayerState } from './state';
import type { GameAction } from './actions';
import { checkWin, lastPathIndex } from './rules';

function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function applyCardEffect(player: PlayerState, card: GameCard, pathLen: number): PlayerState {
  const p = { ...player, resources: { ...player.resources } };
  const { effect } = card;
  switch (effect.kind) {
    case 'resource':
      if (effect.resource) {
        p.resources[effect.resource] = (p.resources[effect.resource] ?? 0) + (effect.delta ?? 0);
      }
      break;
    case 'move':
      p.position = Math.max(0, Math.min(pathLen - 1, p.position + (effect.spaces ?? 0)));
      break;
    case 'skip':
      p.skipsRemaining += 1;
      break;
    default:
      break;
  }
  return p;
}

export function reduce(def: GameDefinition, state: GameState, action: GameAction): GameState {
  const pathLen = def.board.path.length;
  const current = state.players[state.currentPlayerIndex];
  if (!current) return state;

  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.phase !== 'ROLL') return state;
      if (current.skipsRemaining > 0) {
        const players = state.players.map((p, i) =>
          i === state.currentPlayerIndex ? { ...p, skipsRemaining: p.skipsRemaining - 1 } : p,
        );
        return {
          ...state,
          players,
          phase: 'END_TURN',
          log: [...state.log, `${current.name} skips a turn.`],
        };
      }
      const roll = rollDice(def.dice.count, def.dice.sides);
      const total = roll.reduce((a, b) => a + b, 0);
      const newPos = Math.min(current.position + total, pathLen - 1);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, position: newPos } : p,
      );
      const spaceId = def.board.path[newPos] ?? -1;
      const space = def.board.spaces.find((s) => s.id === spaceId);
      const needsCard = space?.cardId;
      return {
        ...state,
        players,
        lastRoll: roll,
        phase: needsCard ? 'DRAW' : 'END_TURN',
        log: [...state.log, `${current.name} rolled ${total} → space "${space?.label ?? '?'}"`],
      };
    }

    case 'DRAW_CARD': {
      if (state.phase !== 'DRAW') return state;
      const player = state.players[state.currentPlayerIndex]!;
      const spaceId = def.board.path[player.position] ?? -1;
      const space = def.board.spaces.find((s) => s.id === spaceId);
      const card = def.cards.find((c) => c.id === space?.cardId);
      if (!card) return { ...state, phase: 'END_TURN' };
      return {
        ...state,
        drawnCard: card.id,
        phase: 'RESOLVE',
        log: [...state.log, `${player.name} drew: "${card.title}"`],
      };
    }

    case 'CONFIRM_CARD': {
      if (state.phase !== 'RESOLVE' || !state.drawnCard) return state;
      const card = def.cards.find((c) => c.id === state.drawnCard);
      if (!card) return { ...state, phase: 'END_TURN', drawnCard: null };
      const updatedPlayer = applyCardEffect(
        state.players[state.currentPlayerIndex]!,
        card,
        pathLen,
      );
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? updatedPlayer : p,
      );
      const won = checkWin(def, updatedPlayer);
      return {
        ...state,
        players,
        drawnCard: null,
        phase: won ? 'GAME_OVER' : 'END_TURN',
        winner: won ? updatedPlayer.id : null,
        log: won ? [...state.log, `🎉 ${updatedPlayer.name} wins!`] : state.log,
      };
    }

    case 'END_TURN': {
      if (state.phase !== 'END_TURN') return state;
      const player = state.players[state.currentPlayerIndex]!;
      if (checkWin(def, player)) {
        return { ...state, phase: 'GAME_OVER', winner: player.id };
      }
      // Check if current player is at last space
      if (player.position >= lastPathIndex(def)) {
        return { ...state, phase: 'GAME_OVER', winner: player.id };
      }
      const next = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        phase: 'ROLL',
        currentPlayerIndex: next,
        turnCount: state.turnCount + 1,
      };
    }

    default:
      return state;
  }
}
