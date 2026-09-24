'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRollCallT } from './messages';

const START = 30 * 60;

/** The 30-minute countdown from the original Roll Call app. */
export function Countdown() {
  const t = useRollCallT();
  const [left, setLeft] = useState(START);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) setRunning(false);
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
      <Clock className="size-4 text-amber-500" />
      <span className="sr-only">{t.timer}</span>
      <span className="font-mono text-sm tabular-nums">{`${mm}:${ss}`}</span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => setRunning(!running)}
      >
        {running ? t.timerPause : t.timerStart}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => {
          setRunning(false);
          setLeft(START);
        }}
      >
        {t.timerReset}
      </Button>
    </div>
  );
}
