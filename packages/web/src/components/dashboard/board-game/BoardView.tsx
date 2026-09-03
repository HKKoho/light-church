'use client';

import type { GameDefinition } from '@/lib/board-game/types';
import type { PlayerState } from '@/lib/board-game/state';

interface Props {
  def: GameDefinition;
  players: PlayerState[];
}

const COLS = 8;

function spaceLayout(totalSpaces: number) {
  // Boustrophedon (snake) layout: left-to-right on even rows, right-to-left on odd rows
  return Array.from({ length: totalSpaces }, (_, i) => {
    const row = Math.floor(i / COLS);
    const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS);
    return { row, col };
  });
}

const SPACE_TYPE_CLASSES: Record<string, string> = {
  start: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400',
  finish: 'bg-amber-100 dark:bg-amber-900/40 border-amber-400',
  event: 'bg-sky-100 dark:bg-sky-900/40 border-sky-400',
  challenge: 'bg-rose-100 dark:bg-rose-900/40 border-rose-400',
  blessing: 'bg-violet-100 dark:bg-violet-900/40 border-violet-400',
  safe: 'bg-slate-100 dark:bg-slate-800/40 border-slate-300',
};

export function BoardView({ def, players }: Props) {
  const path = def.board.path;
  const spaces = def.board.spaces;
  const layout = spaceLayout(path.length);
  const rows = Math.ceil(path.length / COLS);

  return (
    <div className="overflow-auto rounded-lg border border-border bg-background p-2">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(60px, 1fr))`,
          gridTemplateRows: `repeat(${rows}, 60px)`,
        }}
      >
        {path.map((spaceId, pathIndex) => {
          const space = spaces.find((s) => s.id === spaceId);
          const pos = layout[pathIndex];
          if (!space || !pos) return null;
          const typeClass = SPACE_TYPE_CLASSES[space.type] ?? SPACE_TYPE_CLASSES['safe']!;
          const playersHere = players.filter((p) => p.position === pathIndex);

          return (
            <div
              key={pathIndex}
              className={`relative flex flex-col items-center justify-center rounded border text-center ${typeClass}`}
              style={{ gridColumn: pos.col + 1, gridRow: pos.row + 1 }}
              title={space.label}
            >
              <span className="max-w-full truncate px-1 text-[9px] font-medium leading-tight">
                {space.label}
              </span>
              <span className="text-[8px] text-muted-foreground">{pathIndex}</span>
              {playersHere.length > 0 && (
                <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                  {playersHere.map((p) => (
                    <span
                      key={p.id}
                      className="size-2.5 rounded-full border border-white shadow"
                      style={{ background: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {Object.entries(SPACE_TYPE_CLASSES).map(([type, cls]) => (
          <span key={type} className={`rounded border px-1.5 py-0.5 ${cls}`}>
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
