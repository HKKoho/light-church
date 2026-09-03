/**
 * Estimates per-word start times and durations by distributing a known total
 * audio duration proportionally across each word's character length.
 *
 * Piper doesn't emit word-level timestamps, so this is a proportional
 * approximation rather than a true alignment — good enough to drive
 * TalkingHead.js's built-in `lipsync-en` module, which derives visemes from
 * `words`/`wtimes`/`wdurations` alone.
 */

const MIN_WEIGHT_CHARS = 2;

export interface WordTimings {
  readonly words: string[];
  readonly wtimes: number[];
  readonly wdurations: number[];
}

export function estimateWordTimings(text: string, durationMs: number): WordTimings {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationMs <= 0) {
    return { words: [], wtimes: [], wdurations: [] };
  }

  const weights = words.map((word) => Math.max(word.length, MIN_WEIGHT_CHARS));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const wtimes: number[] = [];
  const wdurations: number[] = [];
  let elapsed = 0;

  for (const weight of weights) {
    const duration = Math.round((weight / totalWeight) * durationMs);
    wtimes.push(elapsed);
    wdurations.push(duration);
    elapsed += duration;
  }

  return { words, wtimes, wdurations };
}
