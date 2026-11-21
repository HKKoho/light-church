'use client';

import type { TheologyPassage } from '@clawix/shared';
import { cn } from '@/lib/utils';
import { useTheologyT } from '../messages';

export const sourceAnchor = (turn: number, n: number) => `src-${turn}-${n}`;

/** The numbered passages behind one answer; [n] in the answer links here. */
export function SourcesPanel({
  turn,
  passages,
  highlighted,
}: {
  turn: number;
  passages: readonly TheologyPassage[];
  highlighted: number | null;
}) {
  const t = useTheologyT();
  if (passages.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noSources}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {passages.map((p, i) => (
        <li
          key={p.chunkId}
          id={sourceAnchor(turn, i + 1)}
          className={cn(
            'scroll-mt-4 rounded-md border p-3 text-xs transition-colors',
            highlighted === i + 1 && 'border-primary bg-primary/5',
          )}
        >
          <p className="font-medium">
            [{i + 1}] {p.sourceTitle}
            {p.author && <span className="font-normal text-muted-foreground"> · {p.author}</span>}
            {p.page !== null && (
              <span className="font-normal text-muted-foreground"> · {t.page(p.page)}</span>
            )}
          </p>
          {p.heading && <p className="mt-0.5 text-muted-foreground">{p.heading}</p>}
          <p className="mt-1.5 line-clamp-6 whitespace-pre-line text-muted-foreground">{p.text}</p>
          {p.scriptureRefs.length > 0 && (
            <p className="mt-1.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {p.scriptureRefs.join(' · ')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
