'use client';

import { useRef, useState } from 'react';
import { Download, FileText, ImageIcon, Loader2, Music, Star, Trash2, Upload } from 'lucide-react';
import type { ActivityAssetInfo } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import {
  assetPath,
  downloadAsset,
  formatBytes,
  uploadActivityAsset,
  useAssetUrl,
} from './activity-api';
import { useActivityT } from './messages';

interface FilesPanelProps {
  readonly activityId: string;
  readonly assets: readonly ActivityAssetInfo[];
  readonly canEdit: boolean;
  readonly coverAssetId: string | null;
  /** Set only while editing: picking a cover changes the draft. */
  readonly onSetCover?: (assetId: string) => void;
  readonly onAssetsChanged: (assets: ActivityAssetInfo[]) => void;
}

function Photo({ activityId, asset }: { activityId: string; asset: ActivityAssetInfo }) {
  const url = useAssetUrl(activityId, asset.id);
  return url ? (
    <img src={url} alt={asset.fileName} className="aspect-square w-full rounded-md object-cover" />
  ) : (
    <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted">
      <ImageIcon className="size-6 text-muted-foreground" />
    </div>
  );
}

export function FilesPanel({
  activityId,
  assets,
  canEdit,
  coverAssetId,
  onSetCover,
  onAssetsChanged,
}: FilesPanelProps) {
  const t = useActivityT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const added: ActivityAssetInfo[] = [];
    try {
      for (const file of Array.from(files)) added.push(await uploadActivityAsset(activityId, file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      onAssetsChanged([...assets, ...added]);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (asset: ActivityAssetInfo) => {
    setError(null);
    try {
      await authFetch(assetPath(activityId, asset.id), { method: 'DELETE' });
      onAssetsChanged(assets.filter((a) => a.id !== asset.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.saveFailed);
    }
  };

  const actions = (asset: ActivityAssetInfo) => (
    <div className="flex gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="size-7"
        aria-label={t.download}
        onClick={() => void downloadAsset(activityId, asset)}
      >
        <Download className="size-3.5" />
      </Button>
      {canEdit && onSetCover && asset.kind === 'image' && asset.id !== coverAssetId && (
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={t.setCover}
          title={t.setCover}
          onClick={() => onSetCover(asset.id)}
        >
          <Star className="size-3.5" />
        </Button>
      )}
      {canEdit && (
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={t.deleteFile}
          onClick={() => void remove(asset)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  );

  const photos = assets.filter((a) => a.kind === 'image');
  const others = assets.filter((a) => a.kind !== 'image');

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.docx,.xlsx,.pptx,.txt,.mp3,.m4a,.wav"
            onChange={(e) => void upload(e.target.files)}
          />
          <Button
            variant="outline"
            className="w-fit"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {busy ? t.uploading : t.upload}
          </Button>
          <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {assets.length === 0 && <p className="text-sm text-muted-foreground">{t.nothingYet}</p>}

      {photos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t.photos}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((a) => (
              <figure key={a.id} className="flex flex-col gap-1">
                <Photo activityId={activityId} asset={a} />
                <figcaption className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">
                    {a.id === coverAssetId ? `★ ${t.cover}` : a.fileName}
                  </span>
                  <span className="ml-auto">{actions(a)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            {t.documents} / {t.audioFiles}
          </h3>
          <ul className="divide-y rounded-md border">
            {others.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                {a.kind === 'audio' ? (
                  <Music className="size-4 text-muted-foreground" />
                ) : (
                  <FileText className="size-4 text-muted-foreground" />
                )}
                <span className="truncate">{a.fileName}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                <span className="ml-auto">{actions(a)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
