'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import type { GameDefinition } from '@/lib/board-game/types';
import { createInitialState } from '@/lib/board-game/state';
import { reduce } from '@/lib/board-game/reducer';
import { saveGame, loadGame, clearGame } from '@/lib/board-game/persistence';
import { BoardView } from '@/components/dashboard/board-game/BoardView';
import { CardPanel } from '@/components/dashboard/board-game/CardPanel';
import { DiceRoller } from '@/components/dashboard/board-game/DiceRoller';
import { Button } from '@/components/ui/button';
import { ComingSoon } from '@/components/dashboard/coming-soon';
import ruthGame from './ruth.game.json';

const DEF = ruthGame as unknown as GameDefinition;
const DEFAULT_PLAYERS = ['Ruth', 'Boaz', 'Naomi', 'Orpah'];

// Flip to true once the game-studio agent wiring ships (Phase 2) and this
// demo is backed by real persistence instead of localStorage.
const GAME_ENABLED = false;

export default function GamePage() {
  if (!GAME_ENABLED) {
    return (
      <ComingSoon
        title="The Journey of Ruth"
        description="A Scripture board game of loyalty, harvest, and redemption for family devotion and youth ministry."
        eta="Phase 2"
      />
    );
  }
  return <GamePageContent />;
}

function GamePageContent() {
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof createInitialState>, a: Parameters<typeof reduce>[2]) =>
      reduce(DEF, s, a),
    undefined,
    () => loadGame(DEF.id) ?? createInitialState(DEF, DEFAULT_PLAYERS.slice(0, 2)),
  );

  useEffect(() => {
    saveGame(state);
  }, [state]);

  const restart = useCallback((count: number) => {
    clearGame(DEF.id);
    setPlayerCount(count);
    dispatch({ type: 'END_TURN' }); // will be ignored; we need a reset path
    // Full reset: create fresh state by navigating — simpler than a RESET action
    window.location.reload();
  }, []);

  const currentPlayer = state.players[state.currentPlayerIndex];

  if (playerCount === null && state.turnCount === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{DEF.title}</h1>
          {DEF.subtitle && <p className="mt-1 text-muted-foreground">{DEF.subtitle}</p>}
          {DEF.description && (
            <p className="mt-3 max-w-md text-sm text-muted-foreground">{DEF.description}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium">How many players?</p>
          <div className="flex gap-2">
            {Array.from(
              { length: DEF.maxPlayers - DEF.minPlayers + 1 },
              (_, i) => i + DEF.minPlayers,
            ).map((n) => (
              <Button
                key={n}
                variant="outline"
                onClick={() => {
                  setPlayerCount(n);
                  clearGame(DEF.id);
                  // initialise with chosen count
                  Object.assign(state, createInitialState(DEF, DEFAULT_PLAYERS.slice(0, n)));
                  window.location.reload();
                }}
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h1 className="text-xl font-semibold">{DEF.title}</h1>
          {DEF.subtitle && <p className="text-xs text-muted-foreground">{DEF.subtitle}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => restart(state.players.length)}>
          <RotateCcw className="mr-1.5 size-4" />
          Restart
        </Button>
      </header>

      {/* Win banner */}
      {state.phase === 'GAME_OVER' && state.winner !== null && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
          <Trophy className="size-5 text-amber-500" />
          <span className="font-semibold">
            {state.players.find((p) => p.id === state.winner)?.name ?? 'Someone'} wins!
          </span>
        </div>
      )}

      {/* Player scoreboard */}
      <div className="flex flex-wrap gap-2">
        {state.players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
              p.id === state.players[state.currentPlayerIndex]?.id
                ? 'border-primary/50 bg-primary/5 font-medium'
                : 'border-border bg-card'
            }`}
          >
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span>{p.name}</span>
            <span className="text-xs text-muted-foreground">pos {p.position}</span>
            {Object.entries(p.resources).map(([res, val]) => (
              <span key={res} className="rounded bg-muted px-1 text-xs">
                {res}: {val}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Board */}
      <BoardView def={DEF} players={state.players} />

      {/* Controls */}
      {currentPlayer && state.phase !== 'GAME_OVER' && (
        <div className="grid gap-3 md:grid-cols-2">
          <DiceRoller
            lastRoll={state.lastRoll}
            phase={state.phase}
            currentPlayerName={currentPlayer.name}
            onRoll={() => dispatch({ type: 'ROLL_DICE' })}
            onEndTurn={() => dispatch({ type: 'END_TURN' })}
          />
          <CardPanel
            def={DEF}
            drawnCardId={state.drawnCard}
            phase={state.phase}
            onDraw={() => dispatch({ type: 'DRAW_CARD' })}
            onConfirm={() => dispatch({ type: 'CONFIRM_CARD' })}
          />
        </div>
      )}

      {/* Log */}
      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
          Game Log ({state.log.length})
        </summary>
        <ol className="max-h-48 overflow-y-auto px-4 pb-3">
          {[...state.log].reverse().map((entry, i) => (
            <li key={i} className="py-0.5 text-xs text-muted-foreground">
              {entry}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
