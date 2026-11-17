'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { ministriesNavMessages, ministryCategories } from '@/components/dashboard/ministries-nav';
import { aiToolsNavMessages } from '@/components/dashboard/ai-tools-nav-item';
import { phase2Items, sidebarNavMessages } from '@/components/dashboard/app-sidebar';
import { BUILT_IN_AI_TOOLS } from '@/components/dashboard/built-in-ai-tools';
import { aiToolLabel, useAiTools } from '@/hooks/use-ai-tools';
import {
  builtInAiToolNavKey,
  reloadNavVisibility,
  setHiddenNavKeys,
  sidebarGroupNavKey,
  sidebarItemNavKey,
  topbarItemNavKey,
  topbarMenuNavKey,
  uploadedAiToolNavKey,
  useNavVisibility,
} from '@/hooks/use-nav-visibility';

const messages = {
  en: {
    aiToolsSection: 'AI Tools (sidebar)',
    aiToolsDescription: 'Show or hide each AI tool in the sidebar and on the AI Tools page.',
    topbarDescription: 'Turn off the menu to hide it entirely, or hide individual items.',
    phase2Section: 'P2 — AI Volunteers (sidebar)',
    sidebarGroupDescription: 'Turn off the group to hide it entirely, or hide individual items.',
    wholeGroup: 'Show this group',
    wholeMenu: 'Show this menu',
    save: 'Save',
    saveFailed: 'Could not save — try again.',
    savedTitle: 'Saved',
    savedDescription: 'Navigation visibility has been updated for everyone.',
  },
  'zh-TW': {
    aiToolsSection: 'AI 工具（側邊欄）',
    aiToolsDescription: '在側邊欄及 AI 工具頁面顯示或隱藏各個 AI 工具。',
    topbarDescription: '關閉選單可整個隱藏，或逐項隱藏。',
    phase2Section: 'P2 — AI 同工（側邊欄）',
    sidebarGroupDescription: '關閉群組可整個隱藏，或逐項隱藏。',
    wholeGroup: '顯示此群組',
    wholeMenu: '顯示此選單',
    save: '儲存',
    saveFailed: '無法儲存，請再試一次。',
    savedTitle: '已儲存',
    savedDescription: '所有使用者的導覽顯示設定已更新。',
  },
} satisfies Messages<{
  aiToolsSection: string;
  aiToolsDescription: string;
  topbarDescription: string;
  phase2Section: string;
  sidebarGroupDescription: string;
  wholeGroup: string;
  wholeMenu: string;
  save: string;
  saveFailed: string;
  savedTitle: string;
  savedDescription: string;
}>;

interface ToggleRowProps {
  readonly label: string;
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly onChange: (checked: boolean) => void;
}

function ToggleRow({ label, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={disabled ? 'text-muted-foreground' : undefined}>{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

/** Super-admin switches for the top-bar menus and sidebar AI Tools. */
export function NavigationVisibilityTab() {
  const t = useT(messages);
  const navT = useT(ministriesNavMessages);
  const toolsT = useT(aiToolsNavMessages);
  const sidebarT = useT(sidebarNavMessages);
  const { lang } = useLanguage();
  const { tools } = useAiTools();
  const { hiddenKeys } = useNavVisibility();

  const [draft, setDraft] = useState<ReadonlySet<string>>(hiddenKeys);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always start from the server's latest copy, then track it until edited.
  useEffect(() => {
    void reloadNavVisibility();
  }, []);
  useEffect(() => {
    setDraft(hiddenKeys);
  }, [hiddenKeys]);

  const isVisible = (key: string) => !draft.has(key);
  const setVisible = (key: string, visible: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const hiddenNavKeys = [...draft].sort();
      await authFetch('/api/v1/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenNavKeys }),
      });
      setHiddenNavKeys(hiddenNavKeys);
      setSaved(true);
    } catch {
      setError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const phase2Key = sidebarGroupNavKey('phase2');
  const phase2Visible = isVisible(phase2Key);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.phase2Section}</CardTitle>
          <CardDescription>{t.sidebarGroupDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          <ToggleRow
            label={t.wholeGroup}
            checked={phase2Visible}
            onChange={(v) => {
              setVisible(phase2Key, v);
            }}
          />
          {phase2Items.map((item) => {
            const key = sidebarItemNavKey('phase2', item.key);
            return (
              <ToggleRow
                key={key}
                label={sidebarT.nav[item.key as keyof typeof sidebarT.nav]}
                checked={isVisible(key)}
                disabled={!phase2Visible}
                onChange={(v) => {
                  setVisible(key, v);
                }}
              />
            );
          })}
        </CardContent>
      </Card>

      {ministryCategories.map((category) => {
        const menuKey = topbarMenuNavKey(category.key);
        const menuVisible = isVisible(menuKey);
        const itemKeys = [...category.itemKeys, ...(category.extraItemKeys ?? [])];
        return (
          <Card key={category.key}>
            <CardHeader>
              <CardTitle className="text-base">
                {navT.category[category.key as keyof typeof navT.category]}
              </CardTitle>
              <CardDescription>{t.topbarDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              <ToggleRow
                label={t.wholeMenu}
                checked={menuVisible}
                onChange={(v) => {
                  setVisible(menuKey, v);
                }}
              />
              {itemKeys.map((itemKey) => {
                const key = topbarItemNavKey(category.key, itemKey);
                return (
                  <ToggleRow
                    key={key}
                    label={navT.nav[itemKey as keyof typeof navT.nav]}
                    checked={isVisible(key)}
                    disabled={!menuVisible}
                    onChange={(v) => {
                      setVisible(key, v);
                    }}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.aiToolsSection}</CardTitle>
          <CardDescription>{t.aiToolsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {BUILT_IN_AI_TOOLS.map((tool) => {
            const key = builtInAiToolNavKey(tool.key);
            return (
              <ToggleRow
                key={key}
                label={toolsT.builtIn[tool.key]}
                checked={isVisible(key)}
                onChange={(v) => {
                  setVisible(key, v);
                }}
              />
            );
          })}
          {tools.map((tool) => {
            const key = uploadedAiToolNavKey(tool.name);
            return (
              <ToggleRow
                key={key}
                label={aiToolLabel(tool, lang)}
                checked={isVisible(key)}
                onChange={(v) => {
                  setVisible(key, v);
                }}
              />
            );
          })}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {t.save}
        </Button>
      </div>

      <SuccessDialog
        open={saved}
        onOpenChange={setSaved}
        title={t.savedTitle}
        description={t.savedDescription}
      />
    </div>
  );
}
