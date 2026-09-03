'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ImagePlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { authFetch, ensureAccessToken } from '@/lib/auth';
import { useAuthedImageUrl } from '@/hooks/use-authed-image';
import { Label } from '@/components/ui/label';
import { useT, type Messages } from '@/lib/i18n';

// Same disk-backed photo store used by the talkingface SadTalker pipeline
// (packages/api/src/talkingface/talkingface-avatar.controller.ts) — reused
// here so an agent's avatar and its talking-face photo are one shared pool.
const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const ADMIN_ROLES = new Set(['super_admin', 'admin_staff']);

interface AvatarListItem {
  photoId: string;
  filename: string;
  uploadedAt: string;
}

export function agentAvatarUrl(photoId: string): string {
  return `${API_BASE}/api/v1/talkingface/avatar/${photoId}`;
}

/**
 * Renders an avatar photo from the (auth-protected) talkingface photo store.
 * Use this instead of a plain <img src={agentAvatarUrl(...)}> — the endpoint
 * only accepts a bearer token, which a bare <img> tag can never send.
 */
export function AgentAvatarImage({
  photoId,
  className,
}: {
  photoId: string;
  className?: string;
}) {
  const url = useAuthedImageUrl(agentAvatarUrl(photoId));
  if (!url) return <div className={className} />;
  return <img src={url} alt="" className={className} />;
}

const messages = {
  en: {
    avatar: 'Avatar',
    avatarHint: 'Pick a photo to represent this agent, or upload a new one.',
    uploadPhoto: 'Upload',
    none: 'None',
    adminOnly: 'Only admin staff can set an agent avatar.',
  },
  'zh-TW': {
    avatar: '頭像',
    avatarHint: '選擇一張照片代表此代理，或上傳新照片。',
    uploadPhoto: '上傳',
    none: '無',
    adminOnly: '僅管理人員可設定代理頭像。',
  },
} satisfies Messages<{
  avatar: string;
  avatarHint: string;
  uploadPhoto: string;
  none: string;
  adminOnly: string;
}>;

export function AgentAvatarPicker({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: string | null;
  onChange: (photoId: string | null) => void;
}) {
  const t = useT(messages);
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;
  const [avatars, setAvatars] = useState<AvatarListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    authFetch<AvatarListItem[]>('/api/v1/talkingface/avatar')
      .then(setAvatars)
      .catch(() => {
        /* non-fatal */
      });
  }, [isAdmin]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const token = await ensureAccessToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/v1/talkingface/avatar/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const item = (await res.json()) as AvatarListItem;
      setAvatars((prev) => [item, ...prev]);
      onChange(item.photoId);
    } catch {
      /* upload failed — admin can retry */
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  if (!isAdmin) {
    // Always echo the existing value back as a hidden field, even though this
    // viewer can't change it — otherwise submitting the surrounding form would
    // silently clear an avatar set by an admin (FormData omits a field the
    // picker never rendered).
    return (
      <div className="flex flex-col gap-2">
        <input type="hidden" name="avatarPhotoId" value={value ?? ''} />
        {value && (
          <>
            <Label>{t.avatar}</Label>
            <AgentAvatarImage
              photoId={value}
              className="size-14 rounded-full border object-cover"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{t.avatar}</Label>
      <input type="hidden" name="avatarPhotoId" value={value ?? ''} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          title={t.none}
          onClick={() => onChange(null)}
          className={`flex size-14 shrink-0 items-center justify-center rounded-full border bg-background transition-colors ${
            !value ? 'ring-2 ring-primary' : 'hover:bg-muted'
          }`}
        >
          <Bot className="size-6 text-muted-foreground" />
        </button>

        {avatars.map((a) => (
          <button
            key={a.photoId}
            type="button"
            title={a.filename}
            onClick={() => onChange(a.photoId)}
            className={`size-14 shrink-0 overflow-hidden rounded-full border transition-colors ${
              value === a.photoId ? 'ring-2 ring-primary' : 'hover:opacity-80'
            }`}
          >
            <AgentAvatarImage photoId={a.photoId} className="size-full object-cover" />
          </button>
        ))}

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex size-14 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground hover:bg-muted"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </button>
        <input
          ref={fileInputRef}
          id={`${idPrefix}-avatar-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t.avatarHint}</p>
    </div>
  );
}
