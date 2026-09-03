'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';

const messages = {
  en: {
    title: 'Profile',
    description: 'Manage your account settings.',
    failedLoad: 'Failed to load profile',
    profileUpdated: 'Profile updated successfully.',
    failedUpdate: 'Failed to update profile',
    passwordsMismatch: 'New passwords do not match.',
    passwordTooShort: 'New password must be at least 8 characters.',
    passwordChanged: 'Password changed successfully.',
    failedChangePassword: 'Failed to change password',
    account: 'Account',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    memberSince: 'Member since',
    editProfile: 'Edit Profile',
    displayName: 'Display Name',
    telegramId: 'Telegram ID',
    telegramPlaceholder: 'Your numeric Telegram ID',
    telegramHelp:
      'Used to link your account with the Telegram bot. Message @userinfobot on Telegram to find your numeric ID.',
    whatsappJid: 'WhatsApp JID',
    whatsappPlaceholder: '15551234567@s.whatsapp.net or 12345...@lid',
    whatsappHelp1: 'Used to link your account with the WhatsApp bot. Two valid forms:',
    whatsappHelp2: '(legacy phone-based, e.g.',
    whatsappHelp3: ') or',
    whatsappHelp4:
      'for newer privacy-preserving accounts. The simplest way to find yours is to send any text from the test phone to the bot — the API logs will show the exact value to paste here.',
    saveChanges: 'Save Changes',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
  },
  'zh-TW': {
    title: '個人資料',
    description: '管理您的帳戶設定。',
    failedLoad: '無法載入個人資料',
    profileUpdated: '個人資料已成功更新。',
    failedUpdate: '無法更新個人資料',
    passwordsMismatch: '兩次輸入的新密碼不一致。',
    passwordTooShort: '新密碼至少需 8 個字元。',
    passwordChanged: '密碼已成功變更。',
    failedChangePassword: '無法變更密碼',
    account: '帳戶',
    email: '電子郵件',
    role: '角色',
    status: '狀態',
    statusActive: '啟用中',
    statusInactive: '未啟用',
    memberSince: '加入時間',
    editProfile: '編輯個人資料',
    displayName: '顯示名稱',
    telegramId: 'Telegram ID',
    telegramPlaceholder: '您的 Telegram 數字 ID',
    telegramHelp:
      '用於將您的帳戶與 Telegram 機器人連結。在 Telegram 上傳訊息給 @userinfobot 以查詢您的數字 ID。',
    whatsappJid: 'WhatsApp JID',
    whatsappPlaceholder: '15551234567@s.whatsapp.net 或 12345...@lid',
    whatsappHelp1: '用於將您的帳戶與 WhatsApp 機器人連結。有兩種有效格式：',
    whatsappHelp2: '（舊版電話格式，例如',
    whatsappHelp3: '）或',
    whatsappHelp4:
      '適用於較新的隱私保護帳戶。最簡單的查詢方式是從測試手機傳送任意文字給機器人 — API 日誌會顯示應貼上的確切值。',
    saveChanges: '儲存變更',
    changePassword: '變更密碼',
    currentPassword: '目前密碼',
    newPassword: '新密碼',
    confirmNewPassword: '確認新密碼',
  },
} satisfies Messages<{
  title: string;
  description: string;
  failedLoad: string;
  profileUpdated: string;
  failedUpdate: string;
  passwordsMismatch: string;
  passwordTooShort: string;
  passwordChanged: string;
  failedChangePassword: string;
  account: string;
  email: string;
  role: string;
  status: string;
  statusActive: string;
  statusInactive: string;
  memberSince: string;
  editProfile: string;
  displayName: string;
  telegramId: string;
  telegramPlaceholder: string;
  telegramHelp: string;
  whatsappJid: string;
  whatsappPlaceholder: string;
  whatsappHelp1: string;
  whatsappHelp2: string;
  whatsappHelp3: string;
  whatsappHelp4: string;
  saveChanges: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}>;

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  policyId: string;
  isActive: boolean;
  telegramId: string | null;
  whatsappJid: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const t = useT(messages);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile form
  const [name, setName] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [whatsappJid, setWhatsappJid] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [data, channels] = await Promise.all([
        authFetch<Profile>('/api/v1/me'),
        authFetch<{ data: { type: string; isActive: boolean }[] }>('/api/v1/channels').catch(
          () => ({ data: [] }),
        ),
      ]);
      setProfile(data);
      setName(data.name);
      setTelegramId(data.telegramId ?? '');
      setWhatsappJid(data.whatsappJid ?? '');
      const channelList = Array.isArray(channels.data) ? channels.data : [];
      setTelegramEnabled(
        channelList.some((ch) => ch.type.toLowerCase() === 'telegram' && ch.isActive),
      );
      setWhatsappEnabled(
        channelList.some((ch) => ch.type.toLowerCase() === 'whatsapp' && ch.isActive),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failedLoad);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  async function handleSaveProfile(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await authFetch<Profile>('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          telegramId: telegramId || null,
          whatsappJid: whatsappJid || null,
        }),
      });
      setProfile(data);
      setSuccess(t.profileUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failedUpdate);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.SyntheticEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await authFetch('/api/v1/me/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(t.passwordChanged);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failedChangePassword);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Account info (read-only) */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">{t.account}</h2>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.email}</span>
            <span className="font-medium">{profile?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.role}</span>
            <Badge
              variant={
                profile?.role === 'admin'
                  ? 'default'
                  : profile?.role === 'developer'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {profile?.role}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.status}</span>
            <Badge variant={profile?.isActive ? 'secondary' : 'outline'}>
              {profile?.isActive ? t.statusActive : t.statusInactive}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.memberSince}</span>
            <span className="font-medium">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <form
        onSubmit={(e) => {
          void handleSaveProfile(e);
        }}
        className="rounded-lg border p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">{t.editProfile}</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">{t.displayName}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
            />
          </div>
          {telegramEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-telegram">{t.telegramId}</Label>
              <Input
                id="profile-telegram"
                value={telegramId}
                onChange={(e) => {
                  setTelegramId(e.target.value);
                }}
                placeholder={t.telegramPlaceholder}
                pattern="\d*"
              />
              <p className="text-xs text-muted-foreground">{t.telegramHelp}</p>
            </div>
          )}
          {whatsappEnabled && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-whatsapp">{t.whatsappJid}</Label>
              <Input
                id="profile-whatsapp"
                value={whatsappJid}
                onChange={(e) => {
                  setWhatsappJid(e.target.value);
                }}
                placeholder={t.whatsappPlaceholder}
                pattern="\d+@(s\.whatsapp\.net|lid)"
              />
              <p className="text-xs text-muted-foreground">
                {t.whatsappHelp1}{' '}
                <code className="font-mono">&lt;countrycode&gt;&lt;number&gt;@s.whatsapp.net</code>{' '}
                {t.whatsappHelp2} <code className="font-mono">15551234567@s.whatsapp.net</code>
                {t.whatsappHelp3} <code className="font-mono">&lt;id&gt;@lid</code>{' '}
                {t.whatsappHelp4}
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {t.saveChanges}
            </Button>
          </div>
        </div>
      </form>

      {/* Change password */}
      <form
        onSubmit={(e) => {
          void handleChangePassword(e);
        }}
        className="rounded-lg border p-6"
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <KeyRound className="size-5" />
          {t.changePassword}
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password">{t.currentPassword}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
              }}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">{t.newPassword}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
              }}
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password">{t.confirmNewPassword}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              minLength={8}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.changePassword}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
