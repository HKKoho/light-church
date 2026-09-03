'use client';

import type { TurnPhase } from '@/lib/board-game/state';
import { Button } from '@/components/ui/button';

interface Props {
  lastRoll: number[];
  phase: TurnPhase;
  currentPlayerName: string;
  onRoll: () => void;
  onEndTurn: () => void;
}

const DIE_FACE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceRoller({ lastRoll, phase, currentPlayerName, onRoll, onEndTurn }: Props) {
  const total = lastRoll.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{currentPlayerName}&apos;s turn</span>
        {lastRoll.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {lastRoll.map((d) => DIE_FACE[d] ?? d).join(' ')} = {total}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" disabled={phase !== 'ROLL'} onClick={onRoll} className="flex-1">
          Roll Dice
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={phase !== 'END_TURN'}
          onClick={onEndTurn}
          className="flex-1"
        >
          End Turn
        </Button>
      </div>
    </div>
  );
}
