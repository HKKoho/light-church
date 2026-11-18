'use client';

import Link from 'next/link';
import { ArrowUpRight, FileText, Folder } from 'lucide-react';
import type { FileEntry } from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    openInWorkspace: (label: string) => `Open ${label} in workspace`,
    noFiles: 'No files yet.',
  },
  'zh-TW': {
    openInWorkspace: (label: string) => `在工作區開啟 ${label}`,
    noFiles: '尚無檔案。',
  },
} satisfies Messages<{
  openInWorkspace: (label: string) => string;
  noFiles: string;
}>;

export interface FolderDef {
  readonly path: string;
  readonly label: string;
  /** Display title; defaults to `label` (which is also the `columns` key). */
  readonly title?: string;
}

type RenderItemAction = (entry: FileEntry, folderPath: string) => React.ReactNode;

export function FolderColumns({
  folders,
  columns,
  renderItemAction,
}: {
  folders: readonly FolderDef[];
  columns: Record<string, readonly FileEntry[]>;
  renderItemAction?: RenderItemAction;
}) {
  return (
    <div className="flex min-h-[calc(100vh-14rem)] gap-4 overflow-x-auto pb-3">
      {folders.map(({ path, label, title }) => (
        <Column
          key={label}
          label={title ?? label}
          path={path}
          items={columns[label] ?? []}
          renderItemAction={renderItemAction}
        />
      ))}
    </div>
  );
}

function Column({
  label,
  path,
  items,
  renderItemAction,
}: {
  label: string;
  path: string;
  items: readonly FileEntry[];
  renderItemAction?: RenderItemAction;
}) {
  const t = useT(messages);
  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          <span className="font-mono text-xs text-muted-foreground/70">{items.length}</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          asChild
          title={t.openInWorkspace(label)}
        >
          <Link href={`/workspace?path=${encodeURIComponent(path)}`}>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground/60">{t.noFiles}</p>
        ) : (
          items.map((entry) => (
            <FileCard
              key={entry.name}
              entry={entry}
              folderPath={path}
              renderItemAction={renderItemAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FileCard({
  entry,
  folderPath,
  renderItemAction,
}: {
  entry: FileEntry;
  folderPath: string;
  renderItemAction?: RenderItemAction;
}) {
  const targetPath = entry.isDirectory ? entry.path : folderPath;
  const Icon = entry.isDirectory ? Folder : FileText;

  return (
    <div className="group flex flex-col gap-1 rounded-md border border-border border-l-[3px] border-l-primary/50 bg-muted/60 p-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-primary/40 hover:bg-primary/10 hover:shadow-[0_8px_24px_-8px_rgba(217,119,6,0.35)]">
      <div className="flex items-center gap-1.5">
        <Link
          href={`/workspace?path=${encodeURIComponent(targetPath)}`}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="line-clamp-1 font-medium">{entry.name}</span>
        </Link>
        {renderItemAction?.(entry, folderPath)}
      </div>
      {entry.modifiedAt && (
        <Link href={`/workspace?path=${encodeURIComponent(targetPath)}`}>
          <span className="font-mono text-[10px] text-muted-foreground">
            {new Date(entry.modifiedAt).toLocaleDateString()}
          </span>
        </Link>
      )}
    </div>
  );
}
