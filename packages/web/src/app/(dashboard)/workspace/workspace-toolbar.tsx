'use client';

import { FilePlus, FolderPlus, MonitorPlay, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    newFile: 'New File',
    newFolder: 'New Folder',
    upload: 'Upload',
    projectors: 'Projectors',
    itemCount: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
  'zh-TW': {
    newFile: '新增檔案',
    newFolder: '新增資料夾',
    upload: '上傳',
    projectors: '投影',
    itemCount: (n: number) => `${n} 個項目`,
  },
} satisfies Messages<{
  newFile: string;
  newFolder: string;
  upload: string;
  projectors: string;
  itemCount: (n: number) => string;
}>;

interface WorkspaceToolbarProps {
  readonly entryCount: number;
  readonly onNewFile: () => void;
  readonly onNewFolder: () => void;
  readonly onUpload: () => void;
  /** Jumps to /projector, where agent-built micro-tools and games live. */
  readonly onOpenProjectors?: () => void;
}

export function WorkspaceToolbar({
  entryCount,
  onNewFile,
  onNewFolder,
  onUpload,
  onOpenProjectors,
}: WorkspaceToolbarProps) {
  const t = useT(messages);
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onNewFile}>
        <FilePlus className="mr-1.5 size-4" />
        {t.newFile}
      </Button>
      <Button variant="outline" size="sm" onClick={onNewFolder}>
        <FolderPlus className="mr-1.5 size-4" />
        {t.newFolder}
      </Button>
      <Button variant="outline" size="sm" onClick={onUpload}>
        <Upload className="mr-1.5 size-4" />
        {t.upload}
      </Button>
      {onOpenProjectors && (
        <Button variant="outline" size="sm" onClick={onOpenProjectors}>
          <MonitorPlay className="mr-1.5 size-4" />
          {t.projectors}
        </Button>
      )}
      <div className="flex-1" />
      <span className="text-xs text-muted-foreground">{t.itemCount(entryCount)}</span>
    </div>
  );
}
