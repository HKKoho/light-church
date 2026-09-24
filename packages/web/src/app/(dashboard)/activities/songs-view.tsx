'use client';

import { useMemo, useState } from 'react';
import { Music, PlayCircle } from 'lucide-react';
import type { ActivityContent } from '@clawix/shared';
import { Input } from '@/components/ui/input';
import { useAssetUrl } from './activity-api';
import { useActivityT } from './messages';

function SongAudio({ activityId, assetId }: { activityId: string; assetId: string }) {
  const url = useAssetUrl(activityId, assetId);
  return url ? <audio controls src={url} className="w-full" /> : null;
}

export function SongsView({
  activityId,
  content,
}: {
  activityId: string;
  content: ActivityContent;
}) {
  const t = useActivityT();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(
    () => [...new Set(content.songs.map((s) => s.category).filter(Boolean))],
    [content.songs],
  );
  const q = query.trim().toLowerCase();
  const songs = content.songs.filter(
    (s) =>
      (!category || s.category === category) &&
      (!q || `${s.title}\n${s.author}\n${s.lyrics}`.toLowerCase().includes(q)),
  );
  if (content.songs.length === 0)
    return <p className="text-sm text-muted-foreground">{t.nothingYet}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder={t.searchSongs}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {categories.length > 1 &&
          ['', ...categories].map((c) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs ${category === c ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {c || t.allSongs}
            </button>
          ))}
      </div>
      {songs.map((s, i) => (
        <details key={`${s.title}-${i}`} className="rounded-md border p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm">
            <Music className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{s.title}</span>
            <span className="text-xs text-muted-foreground">
              {[t.langs[s.lang], s.category, s.author].filter(Boolean).join(' · ')}
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
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
            {s.lyrics && <p className="whitespace-pre-wrap text-sm leading-relaxed">{s.lyrics}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}
