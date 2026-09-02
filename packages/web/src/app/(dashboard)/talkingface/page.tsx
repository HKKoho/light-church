'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Mic, MicOff, Send, Trash2, Volume2 } from 'lucide-react';
import { authFetch, ensureAccessToken } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpeechInput } from '@/hooks/use-speech-input';
import {
  AvatarStage3D,
  type AvatarStageHandle,
} from '@/components/dashboard/talkingface/AvatarStage3D';
import {
  AvatarStageVideo,
  type AvatarVideoHandle,
} from '@/components/dashboard/talkingface/AvatarStageVideo';
import {
  useTalkingFaceSocket,
  type SpeakChunk,
} from '@/components/dashboard/talkingface/useTalkingFaceSocket';

// Roles allowed to manage avatar photos
const ADMIN_ROLES = new Set(['super_admin', 'admin_staff']);

interface ApiAgent {
  id: string;
  name: string;
  isActive: boolean;
}

interface PaginatedAgents {
  data: ApiAgent[];
}

interface AvatarListItem {
  photoId: string;
  filename: string;
  uploadedAt: string;
}

async function decodeBase64Audio(base64: string): Promise<AudioBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ctx = new AudioContext();
  return ctx.decodeAudioData(bytes.buffer);
}

function avatarPhotoUrl(photoId: string): string {
  return `/api/v1/talkingface/avatar/${photoId}`;
}

export default function TalkingFacePage() {
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;

  // --- agent ---
  const [agentId, setAgentId] = useState<string | null>(null);

  // --- 3D avatar state ---
  const stage3DRef = useRef<AvatarStageHandle>(null);
  const [avatar3DReady, setAvatar3DReady] = useState(false);

  // --- photo-avatar state (admin only) ---
  const stageVideoRef = useRef<AvatarVideoHandle>(null);
  const [avatars, setAvatars] = useState<AvatarListItem[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // mode: '3d' uses TalkingHead.js; 'photo' uses SadTalker video pipeline
  const [mode, setMode] = useState<'3d' | 'photo'>('3d');

  // --- chat state ---
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');

  // Fetch active agent
  useEffect(() => {
    void authFetch<PaginatedAgents>('/api/v1/agents?limit=100')
      .then((res) => {
        const active = res.data.find((a) => a.isActive);
        setAgentId(active?.id ?? null);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load agents'),
      );
  }, []);

  // Fetch avatar list (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    void authFetch<AvatarListItem[]>('/api/v1/talkingface/avatar')
      .then(setAvatars)
      .catch(() => {
        /* non-fatal */
      });
  }, [isAdmin]);

  // --- photo upload ---
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const token = await ensureAccessToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/talkingface/avatar/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const item = (await res.json()) as AvatarListItem;
      setAvatars((prev) => [item, ...prev]);
      setSelectedPhotoId(item.photoId);
      setMode('photo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDeleteAvatar = useCallback(
    async (photoId: string) => {
      await authFetch(`/api/v1/talkingface/avatar/${photoId}`, { method: 'DELETE' }).catch(
        () => {},
      );
      setAvatars((prev) => prev.filter((a) => a.photoId !== photoId));
      if (selectedPhotoId === photoId) {
        setSelectedPhotoId(null);
        setMode('3d');
      }
    },
    [selectedPhotoId],
  );

  // --- WS callbacks ---
  const handleChunk = useCallback(async (chunk: SpeakChunk) => {
    if (chunk.video) {
      // Photo-realistic mode: enqueue the video chunk
      stageVideoRef.current?.enqueue({ video: chunk.video, audio: chunk.audio });
    } else {
      // 3D avatar mode: drive TalkingHead.js with audio + word timings
      const audio = await decodeBase64Audio(chunk.audio);
      stage3DRef.current?.speak({
        audio,
        words: chunk.words,
        wtimes: chunk.wtimes,
        wdurations: chunk.wdurations,
      });
    }
  }, []);

  const handleDone = useCallback((newSessionId: string | null) => {
    setSessionId(newSessionId ?? undefined);
    setSpeaking(false);
  }, []);

  const handleWsError = useCallback((message: string) => {
    setError(`Failed to get a reply: ${message}`);
    setSpeaking(false);
    stageVideoRef.current?.clear();
  }, []);

  const { sendSpeak } = useTalkingFaceSocket({
    onChunk: handleChunk,
    onDone: handleDone,
    onError: handleWsError,
  });

  // --- send message ---
  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !agentId || speaking) return;
      setSpeaking(true);
      setError('');
      setInput('');
      try {
        await sendSpeak(
          agentId,
          trimmed,
          sessionId,
          mode === 'photo' && selectedPhotoId ? selectedPhotoId : undefined,
        );
      } catch (err) {
        setError(`Failed to get a reply: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setSpeaking(false);
      }
    },
    [agentId, sessionId, speaking, sendSpeak, mode, selectedPhotoId],
  );

  const handleSend = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  const handleSpeechResult = useCallback(
    (text: string, isFinal: boolean) => {
      setInput(text);
      if (isFinal) void sendText(text);
    },
    [sendText],
  );

  const speechInput = useSpeechInput(handleSpeechResult);

  const ready = mode === '3d' ? avatar3DReady : !!selectedPhotoId;

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Talking Face</h1>
        <p className="text-sm text-muted-foreground">Agent-driven avatar speech</p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mode toggle — photo mode only visible to admins with avatars */}
      {isAdmin && avatars.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Avatar mode:</span>
          <Button
            size="sm"
            variant={mode === '3d' ? 'default' : 'secondary'}
            onClick={() => setMode('3d')}
          >
            3D Avatar
          </Button>
          <Button
            size="sm"
            variant={mode === 'photo' ? 'default' : 'secondary'}
            onClick={() => setMode('photo')}
            disabled={!selectedPhotoId}
          >
            Photo Realistic
          </Button>
        </div>
      )}

      {/* Avatar stage */}
      <div className="h-[60vh] w-full max-w-xl">
        {mode === '3d' ? (
          <AvatarStage3D
            ref={stage3DRef}
            onReady={() => setAvatar3DReady(true)}
            onError={(m) => setError(`Failed to load avatar: ${m}`)}
          />
        ) : (
          <AvatarStageVideo
            ref={stageVideoRef}
            photoUrl={selectedPhotoId ? avatarPhotoUrl(selectedPhotoId) : undefined}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Admin-only: photo management */}
      {isAdmin && (
        <div className="w-full max-w-xl rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Photo Avatar (Admin)
          </p>

          {/* Upload button */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {uploading ? 'Uploading…' : 'Upload photo'}
            </Button>
            <span className="text-xs text-muted-foreground">JPEG / PNG / WebP · max 10 MB</span>
            <input
              ref={fileInputRef}
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

          {/* Avatar list */}
          {avatars.length > 0 && (
            <ul className="mt-3 space-y-1">
              {avatars.map((a) => (
                <li
                  key={a.photoId}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors cursor-pointer ${
                    selectedPhotoId === a.photoId
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-muted/60'
                  }`}
                  onClick={() => {
                    setSelectedPhotoId(a.photoId);
                    setMode('photo');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarPhotoUrl(a.photoId)}
                      alt={a.filename}
                      className="size-8 rounded-full object-cover"
                    />
                    <span className="truncate max-w-[180px]">{a.filename}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteAvatar(a.photoId);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Chat input */}
      <div className="flex w-full max-w-xl items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={speechInput.listening ? 'Listening…' : 'Say something…'}
          disabled={!ready || !agentId || speaking}
        />
        {speechInput.supported && (
          <Button
            type="button"
            variant={speechInput.listening ? 'default' : 'secondary'}
            size="icon"
            className="size-9 shrink-0 rounded-full"
            disabled={!ready || !agentId || speaking}
            onClick={() => (speechInput.listening ? speechInput.stop() : speechInput.start())}
          >
            {speechInput.listening ? (
              <MicOff className="size-4 animate-pulse" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
        <Button onClick={handleSend} disabled={!ready || !agentId || speaking}>
          {speaking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </div>

      {ready && !agentId && (
        <p className="text-sm text-muted-foreground">
          No active agent found — create one in Agents before using this page.
        </p>
      )}

      {/* 3D avatar smoke-test button */}
      {mode === '3d' && (
        <button
          onClick={() => stage3DRef.current?.speakTestPhrase()}
          disabled={!avatar3DReady}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Volume2 className="size-4" />
          Test speak
        </button>
      )}
    </div>
  );
}
