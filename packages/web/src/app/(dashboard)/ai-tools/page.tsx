'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { ExternalLink, Loader2, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch, getAccessToken } from '@/lib/auth';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import {
  AI_TOOLS_CHANGED_EVENT,
  aiToolDescription,
  aiToolLabel,
  useAiTools,
} from '@/hooks/use-ai-tools';
import { BUILT_IN_AI_TOOLS, type BuiltInAiTool } from '@/components/dashboard/built-in-ai-tools';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const messages = {
  en: {
    phase: 'Phase 1 · AI as a Tool',
    title: 'AI Tools',
    subtitle:
      'Ready-made AI tools for the church team. Pick one and use it — no agent setup needed.',
    empty: 'No church-uploaded AI tools yet. An administrator can upload one below.',
    builtIn: 'Built-in',
    builtInTools: {
      gameBuilder: {
        name: 'Game Builder',
        description:
          'Build a short, Scripture-rooted game for VBS, youth or family devotion — storyboard first, approved by a person before anything is built.',
      },
      missionCamp: {
        name: 'Mission/Camp Companion',
        description:
          'Plan a mission trip, camp or retreat together — details, schedule, daily devotionals, songs, photos, files and notes. Leaders edit; the whole team views.',
      },
      rollCall: {
        name: 'Roll Call',
        description:
          'Take attendance with saved history, pastoral-care alerts and attendance forecasts. Optional local AI reads sign-in sheet photos — names never leave the server.',
      },
    },
    loadError: 'Failed to load AI tools',
    open: 'Open',
    external: 'External link',
    remove: 'Remove',
    removeFailed: 'Remove failed',
    removeConfirmTitle: (name: string) => `Remove "${name}"?`,
    removeConfirmBody: 'This deletes the tool folder for everyone in the church.',
    cancel: 'Cancel',
    uploadTitle: 'Upload an AI tool',
    uploadHint:
      'One self-contained .html file. It is saved as AITools/<tool name>/index.html and appears in the sidebar under that name. Uploading an existing name replaces it.',
    nameLabel: 'Tool name',
    namePlaceholder: 'e.g. Sermon Outline Helper',
    fileLabel: 'HTML file',
    upload: 'Upload',
    uploading: 'Uploading…',
    uploadFailed: 'Upload failed',
    notAuthenticated: 'Not authenticated',
  },
  'zh-TW': {
    phase: '第一階段 · AI 作為工具',
    title: 'AI 工具',
    subtitle: '為教會同工準備好的 AI 工具，選一個即可使用——無需設定代理。',
    empty: '尚無教會上傳的 AI 工具。管理員可在下方上傳。',
    builtIn: '內建',
    builtInTools: {
      gameBuilder: {
        name: '遊戲工坊',
        description:
          '為暑期聖經班、青少年或家庭靈修製作以聖經為本的小遊戲——先有故事板，經人員核准後才開始製作。',
      },
      missionCamp: {
        name: '訪宣/營會指南',
        description:
          '一同籌備訪宣、營會或退修會——資料、行程、每日靈修、詩歌、相片、檔案及筆記。領袖編輯，全隊檢視。',
      },
      rollCall: {
        name: '點名',
        description:
          '點名並保存出席紀錄，附牧養關顧提示及出席預測。可選用本機 AI 讀取簽到表相片——姓名不會離開伺服器。',
      },
    },
    loadError: '無法載入 AI 工具',
    open: '開啟',
    external: '外部連結',
    remove: '移除',
    removeFailed: '移除失敗',
    removeConfirmTitle: (name: string) => `移除「${name}」？`,
    removeConfirmBody: '這會為教會所有人刪除此工具資料夾。',
    cancel: '取消',
    uploadTitle: '上傳 AI 工具',
    uploadHint:
      '單一自足的 .html 檔案，會儲存為 AITools/<工具名稱>/index.html，並以該名稱顯示於側邊欄。上傳相同名稱會取代原有工具。',
    nameLabel: '工具名稱',
    namePlaceholder: '例如：講道大綱助手',
    fileLabel: 'HTML 檔案',
    upload: '上傳',
    uploading: '上傳中…',
    uploadFailed: '上傳失敗',
    notAuthenticated: '尚未驗證身分',
  },
} satisfies Messages<{
  phase: string;
  title: string;
  subtitle: string;
  empty: string;
  builtIn: string;
  builtInTools: Record<BuiltInAiTool['key'], { name: string; description: string }>;
  loadError: string;
  open: string;
  external: string;
  remove: string;
  removeFailed: string;
  removeConfirmTitle: (name: string) => string;
  removeConfirmBody: string;
  cancel: string;
  uploadTitle: string;
  uploadHint: string;
  nameLabel: string;
  namePlaceholder: string;
  fileLabel: string;
  upload: string;
  uploading: string;
  uploadFailed: string;
  notAuthenticated: string;
}>;

function notifyChanged() {
  window.dispatchEvent(new Event(AI_TOOLS_CHANGED_EVENT));
}

function UploadCard() {
  const t = useT(messages);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || name.trim() === '') return;
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error(t.notAuthenticated);
      // `name` must precede the file part: the API reads fields that arrive
      // before the file stream.
      const form = new FormData();
      form.append('name', name.trim());
      form.append('file', file, file.name);
      const res = await fetch(`${API_BASE}/api/v1/ai-tools`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error((body as { message?: string }).message ?? t.uploadFailed);
      }
      setName('');
      if (fileRef.current) fileRef.current.value = '';
      notifyChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="size-4" />
          {t.uploadTitle}
        </CardTitle>
        <CardDescription>{t.uploadHint}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="ai-tool-name">{t.nameLabel}</Label>
          <Input
            id="ai-tool-name"
            value={name}
            maxLength={64}
            placeholder={t.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="ai-tool-file">{t.fileLabel}</Label>
          <Input id="ai-tool-file" ref={fileRef} type="file" accept=".html,.htm" />
        </div>
        <Button onClick={() => void submit()} disabled={busy || name.trim() === ''}>
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Upload className="mr-2 size-4" />
          )}
          {busy ? t.uploading : t.upload}
        </Button>
      </CardContent>
      {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
    </Card>
  );
}

export default function AiToolsPage() {
  const t = useT(messages);
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';
  const { tools, error, isLoading } = useAiTools();
  const [removeError, setRemoveError] = useState<string | null>(null);

  const remove = async (name: string) => {
    setRemoveError(null);
    try {
      await authFetch(`/api/v1/ai-tools/${encodeURIComponent(name)}`, { method: 'DELETE' });
      notifyChanged();
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : t.removeFailed);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <Badge variant="outline" className="mb-2 font-mono text-[10px] uppercase tracking-wider">
          {t.phase}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {(error ?? removeError) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ? t.loadError : removeError}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BUILT_IN_AI_TOOLS.map((tool) => (
          <Card key={tool.key} className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <tool.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.builtInTools[tool.key].name}</span>
              </CardTitle>
              <CardDescription className="line-clamp-2 text-xs">
                {t.builtInTools[tool.key].description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 px-4">
              <Button asChild size="sm">
                <Link href={tool.href}>{t.open}</Link>
              </Button>
              <Badge variant="secondary">{t.builtIn}</Badge>
            </CardContent>
          </Card>
        ))}
        {!isLoading &&
          tools.map((tool) => (
            <Card key={tool.name} className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {tool.kind === 'link' ? (
                    <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Wand2 className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{aiToolLabel(tool, lang)}</span>
                </CardTitle>
                {aiToolDescription(tool, lang) && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {aiToolDescription(tool, lang)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center gap-2 px-4">
                <Button asChild size="sm">
                  <Link href={`/ai-tools/${encodeURIComponent(tool.name)}`}>{t.open}</Link>
                </Button>
                {tool.kind === 'link' && <Badge variant="secondary">{t.external}</Badge>}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label={`${t.remove} ${aiToolLabel(tool, lang)}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t.removeConfirmTitle(aiToolLabel(tool, lang))}
                        </AlertDialogTitle>
                        <AlertDialogDescription>{t.removeConfirmBody}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove(tool.name)}>
                          {t.remove}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {isLoading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        tools.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="size-4 shrink-0" />
            {t.empty}
          </div>
        )
      )}

      {isAdmin && <UploadCard />}
    </div>
  );
}
