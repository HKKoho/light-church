'use client';

import { useAuth } from '@/components/auth-provider';
import { useT, type Messages } from '@/lib/i18n';
import { NavigationVisibilityTab } from '../navigation-visibility-tab';

const messages = {
  en: {
    title: 'Navigation',
    description:
      'Choose which top-bar menus, menu items and AI tools everyone sees. Hidden pages stay reachable by direct link.',
    superAdminOnly: 'Only a super admin can change navigation visibility.',
  },
  'zh-TW': {
    title: '導覽顯示',
    description:
      '選擇所有使用者可見的頂部選單、選單項目及 AI 工具。已隱藏的頁面仍可透過直接連結開啟。',
    superAdminOnly: '只有超級管理員可更改導覽顯示設定。',
  },
} satisfies Messages<{
  title: string;
  description: string;
  superAdminOnly: string;
}>;

export default function NavigationSettingsPage() {
  const t = useT(messages);
  const { user } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>
      {user?.role === 'super_admin' ? (
        <NavigationVisibilityTab />
      ) : (
        <p className="text-sm text-muted-foreground">{t.superAdminOnly}</p>
      )}
    </div>
  );
}
