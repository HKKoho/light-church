'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronRight, Folder, Pencil, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { authFetch } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/format';
import { useT, type Messages } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import type { DirectoryListing, FileContent } from '@clawix/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const messages = {
  en: {
    validation: {
      required: 'Name is required',
      tooLong: 'Name must be 255 characters or fewer',
      slashes: 'Name cannot contain slashes',
    },
    create: {
      titleFile: 'Create New File',
      titleFolder: 'Create New Folder',
      descFile: 'Enter a name for the new file.',
      descFolder: 'Enter a name for the new folder.',
      nameLabel: 'Name',
      placeholderFile: 'e.g. index.ts',
      placeholderFolder: 'e.g. src',
      cancel: 'Cancel',
      creating: 'Creating...',
      create: 'Create',
    },
    del: {
      title: (name: string) => `Delete “${name}”?`,
      itemCount: (n: number) =>
        `This folder contains ${n} ${n === 1 ? 'item' : 'items'}. This action cannot be undone.`,
      folderContents:
        'This folder and all its contents will be deleted. This action cannot be undone.',
      fileWarning: 'This action cannot be undone.',
      cancel: 'Cancel',
      deleting: 'Deleting...',
      delete: 'Delete',
    },
    move: {
      title: (name: string) => `Move “${name}”`,
      desc: 'Select a destination folder.',
      collapse: 'Collapse',
      expand: 'Expand',
      current: '(current)',
      loadError: 'Failed to load directories.',
      workspaceRoot: 'Workspace (root)',
      cancel: 'Cancel',
      moving: 'Moving...',
      move: 'Move',
    },
    discard: {
      title: 'Unsaved Changes',
      descPrefix: 'You have unsaved changes to ',
      descSuffix: '. Discard them?',
      cancel: 'Cancel',
      discard: 'Discard',
    },
    conflict: {
      title: 'File Changed',
      descSuffix:
        ' was modified since you started editing. This may have been caused by an agent or another process.',
      cancel: 'Cancel',
      reload: 'Reload File',
      overwrite: 'Overwrite',
    },
    mermaid: {
      renderError: 'Failed to render diagram',
      errorTitle: 'Mermaid Error',
    },
    fullPreview: {
      title: (name: string) => `Preview: ${name}`,
      srDesc: (name: string, type: string, size: string) =>
        `Full preview of ${name} (${type}, ${size})`,
      editFile: 'Edit file',
      tooLarge: 'File is too large to preview (> 1 MB)',
      binaryFile: 'Binary file — preview not available',
    },
  },
  'zh-TW': {
    validation: {
      required: '名稱為必填',
      tooLong: '名稱不得超過 255 個字元',
      slashes: '名稱不可包含斜線',
    },
    create: {
      titleFile: '新增檔案',
      titleFolder: '新增資料夾',
      descFile: '請輸入新檔案的名稱。',
      descFolder: '請輸入新資料夾的名稱。',
      nameLabel: '名稱',
      placeholderFile: '例如 index.ts',
      placeholderFolder: '例如 src',
      cancel: '取消',
      creating: '建立中...',
      create: '建立',
    },
    del: {
      title: (name: string) => `刪除「${name}」？`,
      itemCount: (n: number) => `此資料夾包含 ${n} 個項目。此操作無法復原。`,
      folderContents: '此資料夾及其所有內容將被刪除。此操作無法復原。',
      fileWarning: '此操作無法復原。',
      cancel: '取消',
      deleting: '刪除中...',
      delete: '刪除',
    },
    move: {
      title: (name: string) => `移動「${name}」`,
      desc: '請選擇目標資料夾。',
      collapse: '收合',
      expand: '展開',
      current: '（目前）',
      loadError: '無法載入資料夾。',
      workspaceRoot: '工作區（根目錄）',
      cancel: '取消',
      moving: '移動中...',
      move: '移動',
    },
    discard: {
      title: '未儲存的變更',
      descPrefix: '您對 ',
      descSuffix: ' 有未儲存的變更。要捨棄嗎？',
      cancel: '取消',
      discard: '捨棄',
    },
    conflict: {
      title: '檔案已變更',
      descSuffix: ' 自您開始編輯後已被修改。這可能是由代理或其他程序所造成。',
      cancel: '取消',
      reload: '重新載入檔案',
      overwrite: '覆寫',
    },
    mermaid: {
      renderError: '無法繪製圖表',
      errorTitle: 'Mermaid 錯誤',
    },
    fullPreview: {
      title: (name: string) => `預覽：${name}`,
      srDesc: (name: string, type: string, size: string) =>
        `${name} 的完整預覽（${type}，${size}）`,
      editFile: '編輯檔案',
      tooLarge: '檔案過大無法預覽（> 1 MB）',
      binaryFile: '二進位檔案 — 無法預覽',
    },
  },
} satisfies Messages<{
  validation: {
    required: string;
    tooLong: string;
    slashes: string;
  };
  create: {
    titleFile: string;
    titleFolder: string;
    descFile: string;
    descFolder: string;
    nameLabel: string;
    placeholderFile: string;
    placeholderFolder: string;
    cancel: string;
    creating: string;
    create: string;
  };
  del: {
    title: (name: string) => string;
    itemCount: (n: number) => string;
    folderContents: string;
    fileWarning: string;
    cancel: string;
    deleting: string;
    delete: string;
  };
  move: {
    title: (name: string) => string;
    desc: string;
    collapse: string;
    expand: string;
    current: string;
    loadError: string;
    workspaceRoot: string;
    cancel: string;
    moving: string;
    move: string;
  };
  discard: {
    title: string;
    descPrefix: string;
    descSuffix: string;
    cancel: string;
    discard: string;
  };
  conflict: {
    title: string;
    descSuffix: string;
    cancel: string;
    reload: string;
    overwrite: string;
  };
  mermaid: {
    renderError: string;
    errorTitle: string;
  };
  fullPreview: {
    title: (name: string) => string;
    srDesc: (name: string, type: string, size: string) => string;
    editFile: string;
    tooLarge: string;
    binaryFile: string;
  };
}>;

// --- Validation ---

const INVALID_NAME_PATTERN = /[/\\]/;
const MAX_NAME_LENGTH = 255;

type NameError = 'required' | 'tooLong' | 'slashes';

function validateName(name: string): NameError | null {
  if (name.length === 0) return 'required';
  if (name.length > MAX_NAME_LENGTH) return 'tooLong';
  if (INVALID_NAME_PATTERN.test(name)) return 'slashes';
  return null;
}

// --- CreateDialog ---

interface CreateDialogProps {
  readonly type: 'file' | 'directory';
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (name: string) => void;
  readonly isLoading?: boolean;
}

export function CreateDialog({
  type,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: CreateDialogProps) {
  const t = useT(messages);
  const [name, setName] = useState('');
  const error = name.length > 0 ? validateName(name) : null;
  const isFile = type === 'file';

  const handleConfirm = useCallback(() => {
    if (!validateName(name)) {
      onConfirm(name);
      setName('');
    }
  }, [name, onConfirm]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setName('');
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isFile ? t.create.titleFile : t.create.titleFolder}</DialogTitle>
          <DialogDescription>{isFile ? t.create.descFile : t.create.descFolder}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="entry-name">{t.create.nameLabel}</Label>
          <Input
            id="entry-name"
            placeholder={isFile ? t.create.placeholderFile : t.create.placeholderFolder}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !error && name.length > 0) handleConfirm();
            }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{t.validation[error]}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleOpenChange(false);
            }}
          >
            {t.create.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={!name || !!error || isLoading}>
            {isLoading ? t.create.creating : t.create.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- DeleteDialog ---

interface DeleteDialogProps {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly childCount?: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
  readonly isLoading?: boolean;
}

export function DeleteDialog({
  name,
  isDirectory,
  childCount,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteDialogProps) {
  const t = useT(messages);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.del.title(name)}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirectory
              ? childCount !== undefined
                ? t.del.itemCount(childCount)
                : t.del.folderContents
              : t.del.fileWarning}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.del.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? t.del.deleting : t.del.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- MoveDialog ---

interface MoveDialogProps {
  readonly name: string;
  readonly currentDir: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: (destination: string) => void;
  readonly isLoading?: boolean;
}

interface DirNode {
  readonly path: string;
  readonly name: string;
  children: DirNode[] | null; // null = not loaded
  expanded: boolean;
}

function updateNode(
  nodes: DirNode[],
  targetPath: string,
  updater: (node: DirNode) => DirNode,
): DirNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return updater(node);
    }
    if (node.children !== null) {
      return { ...node, children: updateNode(node.children, targetPath, updater) };
    }
    return node;
  });
}

async function fetchDirs(path: string): Promise<DirNode[]> {
  const encoded = encodeURIComponent(path);
  const listing = await authFetch<DirectoryListing>(`/api/v1/workspace/files?path=${encoded}`);
  return listing.entries
    .filter((e) => e.type === 'directory')
    .map((e) => ({
      path: e.path,
      name: e.name,
      children: null,
      expanded: false,
    }));
}

export function MoveDialog({
  name,
  currentDir,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: MoveDialogProps) {
  const t = useT(messages);
  const [roots, setRoots] = useState<DirNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load root directories whenever dialog opens
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setFetchError(null);
    setRoots([]);

    fetchDirs('/')
      .then((dirs) => {
        setRoots(dirs);
      })
      .catch(() => {
        setFetchError(t.move.loadError);
      });
  }, [open, t]);

  const handleToggle = useCallback(async (node: DirNode) => {
    const nextExpanded = !node.expanded;

    if (nextExpanded && node.children === null) {
      // Lazy-load children first, then expand
      try {
        const children = await fetchDirs(node.path);
        setRoots((prev) =>
          updateNode(prev, node.path, (n) => ({ ...n, children, expanded: true })),
        );
      } catch {
        // silently leave unexpanded on error
      }
    } else {
      setRoots((prev) => updateNode(prev, node.path, (n) => ({ ...n, expanded: nextExpanded })));
    }
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSelected(null);
        setFetchError(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleConfirm = useCallback(() => {
    if (selected !== null) {
      onConfirm(selected);
    }
  }, [selected, onConfirm]);

  function renderNode(node: DirNode, depth: number): React.ReactNode {
    const isCurrentDir = node.path === currentDir;
    const isSelected = selected === node.path;
    const hasChildren = node.children === null || node.children.length > 0;

    return (
      <div key={node.path}>
        <div
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm transition-colors',
            isSelected && 'bg-accent text-accent-foreground',
            !isSelected && !isCurrentDir && 'hover:bg-muted',
            isCurrentDir && 'cursor-not-allowed opacity-50',
          )}
          style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
          onClick={() => {
            if (!isCurrentDir) setSelected(node.path);
          }}
        >
          <button
            type="button"
            aria-label={node.expanded ? t.move.collapse : t.move.expand}
            className={cn(
              'flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded transition-transform',
              !hasChildren && 'invisible',
            )}
            onClick={(e) => {
              e.stopPropagation();
              void handleToggle(node);
            }}
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', node.expanded && 'rotate-90')}
            />
          </button>
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="truncate">{node.name}</span>
          {isCurrentDir && (
            <span className="ml-auto text-xs text-muted-foreground">{t.move.current}</span>
          )}
        </div>
        {node.expanded && node.children !== null && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  const rootIsCurrentDir = currentDir === '/';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.move.title(name)}</DialogTitle>
          <DialogDescription>{t.move.desc}</DialogDescription>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded border border-border bg-background p-1">
          {/* Workspace root entry */}
          <div
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm transition-colors',
              selected === '/' && 'bg-accent text-accent-foreground',
              selected !== '/' && !rootIsCurrentDir && 'hover:bg-muted',
              rootIsCurrentDir && 'cursor-not-allowed opacity-50',
            )}
            onClick={() => {
              if (!rootIsCurrentDir) setSelected('/');
            }}
          >
            <span className="h-4 w-4 shrink-0" />
            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
            <span className="truncate font-medium">{t.move.workspaceRoot}</span>
            {rootIsCurrentDir && (
              <span className="ml-auto text-xs text-muted-foreground">{t.move.current}</span>
            )}
          </div>

          {fetchError && <p className="px-2 py-2 text-xs text-destructive">{fetchError}</p>}

          {roots.map((node) => renderNode(node, 0))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              handleOpenChange(false);
            }}
          >
            {t.move.cancel}
          </Button>
          <Button onClick={handleConfirm} disabled={selected === null || isLoading}>
            {isLoading ? t.move.moving : t.move.move}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- DiscardDialog ---------- */

interface DiscardDialogProps {
  readonly filename: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onDiscard: () => void;
}

export function DiscardDialog({ filename, open, onOpenChange, onDiscard }: DiscardDialogProps) {
  const t = useT(messages);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.discard.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.discard.descPrefix}
            <strong>{filename}</strong>
            {t.discard.descSuffix}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.discard.cancel}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onDiscard}
          >
            {t.discard.discard}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- ConflictDialog ---------- */

interface ConflictDialogProps {
  readonly filename: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onOverwrite: () => void;
  readonly onReload: () => void;
}

export function ConflictDialog({
  filename,
  open,
  onOpenChange,
  onOverwrite,
  onReload,
}: ConflictDialogProps) {
  const t = useT(messages);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {t.conflict.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{filename}</strong>
            {t.conflict.descSuffix}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.conflict.cancel}</AlertDialogCancel>
          <Button variant="outline" onClick={onReload}>
            {t.conflict.reload}
          </Button>
          <AlertDialogAction
            className="bg-amber-600 text-white hover:bg-amber-700"
            onClick={onOverwrite}
          >
            {t.conflict.overwrite}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- MermaidBlock ---------- */

function MermaidBlock({ code }: { code: string }) {
  const t = useT(messages);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    mermaid
      .render(id, code)
      .then(({ svg: renderedSvg }) => {
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.mermaid.renderError);
          setSvg(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, t]);

  if (error) {
    return (
      <div className="rounded border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">{t.mermaid.errorTitle}</p>
        <pre className="mt-1 text-xs">{error}</pre>
      </div>
    );
  }

  if (svg) {
    return (
      <div
        ref={containerRef}
        className="my-4 flex justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return <div className="my-4 h-32 animate-pulse rounded bg-muted" />;
}

/* ---------- FullPreviewDialog ---------- */

interface FullPreviewDialogProps {
  readonly file: FileContent | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit?: () => void;
}

export function FullPreviewDialog({ file, open, onOpenChange, onEdit }: FullPreviewDialogProps) {
  const t = useT(messages);
  if (!file) return null;

  const isMarkdown = file.type === 'markdown';
  const canEdit = ['text', 'code', 'markdown', 'json'].includes(file.type) && file.content !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">{t.fullPreview.title(file.name)}</DialogTitle>
        <DialogDescription className="sr-only">
          {t.fullPreview.srDesc(file.name, file.type, formatFileSize(file.size))}
        </DialogDescription>
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="truncate text-lg font-semibold">{file.name}</span>
            <Badge variant="secondary" className="shrink-0">
              {file.type}
            </Badge>
            <span className="shrink-0 text-sm text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  onOpenChange(false);
                  onEdit();
                }}
                title={t.fullPreview.editFile}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {file.content === null ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {file.truncated ? t.fullPreview.tooLarge : t.fullPreview.binaryFile}
              </p>
            </div>
          ) : isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className ?? '');
                    const lang = match?.[1];
                    const codeStr = String(children).replace(/\n$/, '');

                    if (lang === 'mermaid') {
                      return <MermaidBlock code={codeStr} />;
                    }

                    // Inline code vs block code
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <pre className="overflow-x-auto rounded-md bg-muted p-4">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  pre({ children }) {
                    // Return children directly to avoid double-wrapping
                    return <>{children}</>;
                  },
                }}
              >
                {file.content}
              </Markdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground/90">
              {file.content}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
