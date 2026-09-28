'use client';

import { useMemo, useState } from 'react';
import { Heart, Music, PlayCircle, Search } from 'lucide-react';
import type { ActivityContent } from '@clawix/shared';
import { useAssetUrl } from '@/app/(dashboard)/activities/activity-api';
import { useCompanionT } from './messages';
import type { CompanionState } from './use-device-state';

type Song = ActivityContent['songs'][number];

function SongAudio({ activityId, assetId }: { activityId: string; assetId: string }) {
  const url = useAssetUrl(activityId, assetId);
  return url ? <audio controls src={url} className="w-full" /> : null;
}

/** Lyrics where tapping a line highlights it, for whoever is leading the singing. */
function Lyrics({ lyrics }: { lyrics: string }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="flex flex-col">
      {lyrics.split('\n').map((line, i) =>
        line.trim() === '' ? (
          <span key={i} className="h-3" />
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => setActive(active === i ? null : i)}
            className={`rounded px-1.5 py-0.5 text-left leading-relaxed transition ${
              active === i
                ? 'bg-amber-200 font-semibold text-amber-950 dark:bg-amber-700/60 dark:text-amber-50'
                : 'hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {line}
          </button>
        ),
      )}
    </div>
  );
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1 text-xs transition ${
    on
      ? 'border-emerald-700 bg-emerald-700 text-white'
      : 'border-stone-200 bg-white hover:border-emerald-600 dark:border-stone-700 dark:bg-stone-900'
  }`;

export function HymnalTab({
  activityId,
  songs,
  state,
  onState,
}: {
  activityId: string;
  songs: readonly Song[];
  state: CompanionState;
  onState: (next: CompanionState) => void;
}) {
  const t = useCompanionT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const categories = useMemo(
    () => [...new Set(songs.map((s) => s.category).filter(Boolean))],
    [songs],
  );

  const saved = new Set(state.savedSongs);
  const toggleSaved = (title: string) =>
    onState({
      ...state,
      savedSongs: saved.has(title)
        ? state.savedSongs.filter((s) => s !== title)
        : [...state.savedSongs, title],
    });

  const q = query.trim().toLowerCase();
  const shown = songs.filter(
    (s) =>
      (!category || s.category === category) &&
      (!savedOnly || saved.has(s.title)) &&
      (!q || `${s.title}\n${s.author}\n${s.lyrics}`.toLowerCase().includes(q)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        <label className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchSongs}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pr-3 pl-9 text-sm dark:border-stone-700 dark:bg-stone-800"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!category)} onClick={() => setCategory('')}>
            {t.all}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(category === c)}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            className={`${chip(savedOnly)} inline-flex items-center gap-1`}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Heart className="size-3" />
            {t.savedOnly} ({state.savedSongs.length})
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{t.highlightHint}</p>
      </div>

      {shown.length === 0 && <p className="text-sm text-muted-foreground">{t.noSongs}</p>}
      {shown.map((s, i) => {
        const isSaved = saved.has(s.title);
        return (
          <details
            key={`${s.title}-${i}`}
            className="group rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Music className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{s.title}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {[s.category, s.author].filter(Boolean).join(' · ')}
                </span>
              </span>
              <button
                type="button"
                aria-label={isSaved ? t.unsave : t.save}
                title={isSaved ? t.unsave : t.save}
                onClick={(e) => {
                  e.preventDefault();
                  toggleSaved(s.title);
                }}
                className="rounded-full p-2 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Heart
                  className={`size-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
              </button>
            </summary>
            <div
              className="flex flex-col gap-3 border-t border-stone-100 p-4 dark:border-stone-800"
              style={{ fontSize: state.fontSize }}
            >
              {s.audioAssetId && <SongAudio activityId={activityId} assetId={s.audioAssetId} />}
              {s.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${s.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1.5 text-sm text-red-600 hover:underline"
                >
                  <PlayCircle className="size-4" />
                  {t.watch}
                </a>
              )}
              {s.lyrics && <Lyrics lyrics={s.lyrics} />}
            </div>
          </details>
        );
      })}
    </div>
  );
}
