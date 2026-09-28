'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Per-device companion state (days read, notes, saved songs, font size) kept
 * in localStorage under one key per activity. Falls back to in-memory state
 * when storage is unavailable (private window).
 */
export function useDeviceState<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // Unreadable or unavailable — keep the initial value.
    }
  }, [key]);

  const save = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable — the change lasts for this visit only.
      }
    },
    [key],
  );

  return [value, save];
}

export interface CompanionState {
  readonly daysRead: readonly number[];
  /** Notes keyed by `${day}:${questionIndex}`. */
  readonly notes: Readonly<Record<string, string>>;
  /** Saved songs by title. */
  readonly savedSongs: readonly string[];
  readonly fontSize: number;
}

export const EMPTY_COMPANION_STATE: CompanionState = {
  daysRead: [],
  notes: {},
  savedSongs: [],
  fontSize: 16,
};

export const noteKey = (day: number, question: number) => `${day}:${question}`;
