'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSpeechInput } from '@/hooks/use-speech-input';
import {
  AvatarStage3D,
  type AvatarStageHandle,
} from '@/components/dashboard/talkingface/AvatarStage3D';
import {
  useTalkingFaceSocket,
  type SpeakChunk,
} from '@/components/dashboard/talkingface/useTalkingFaceSocket';

interface ApiAgent {
  id: string;
  name: string;
  isActive: boolean;
}

interface PaginatedAgents {
  data: ApiAgent[];
}

async function decodeBase64Audio(base64: string): Promise<AudioBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const ctx = new AudioContext();
  return ctx.decodeAudioData(bytes.buffer);
}

export default function TalkingFacePage() {
  const stageRef = useRef<AvatarStageHandle>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch<PaginatedAgents>('/api/v1/agents?limit=100');
        const active = res.data.find((agent) => agent.isActive);
        setAgentId(active?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      }
    })();
  }, []);

  const handleTestSpeak = useCallback(() => {
    stageRef.current?.speakTestPhrase();
  }, []);

  const handleChunk = useCallback(async (chunk: SpeakChunk) => {
    const audio = await decodeBase64Audio(chunk.audio);
    stageRef.current?.speak({
      audio,
      words: chunk.words,
      wtimes: chunk.wtimes,
      wdurations: chunk.wdurations,
    });
  }, []);

  const handleDone = useCallback((newSessionId: string | null) => {
    setSessionId(newSessionId ?? undefined);
    setSpeaking(false);
  }, []);

  const handleError = useCallback((message: string) => {
    setError(`Failed to get a reply: ${message}`);
    setSpeaking(false);
  }, []);

  const { sendSpeak } = useTalkingFaceSocket({
    onChunk: handleChunk,
    onDone: handleDone,
    onError: handleError,
  });

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !agentId || speaking) return;

      setSpeaking(true);
      setError('');
      setInput('');
      try {
        await sendSpeak(agentId, trimmed, sessionId);
      } catch (err) {
        setError(`Failed to get a reply: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setSpeaking(false);
      }
    },
    [agentId, sessionId, speaking, sendSpeak],
  );

  const handleSend = useCallback(() => {
    void sendText(input);
  }, [input, sendText]);

  // Mic click is a full trigger: the final transcript is sent straight to the
  // agent, same as pressing Send — no extra tap needed.
  const handleSpeechResult = useCallback(
    (text: string, isFinal: boolean) => {
      setInput(text);
      if (isFinal) void sendText(text);
    },
    [sendText],
  );

  const speechInput = useSpeechInput(handleSpeechResult);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <header className="flex flex-col gap-1 border-b border-border/60 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Talking Face</h1>
        <p className="text-sm text-muted-foreground">Agent-driven avatar speech</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Type or speak — the active agent replies out loud through a self-hosted Piper voice,
          lips synced to the audio in near real-time.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="h-[60vh] w-full max-w-xl">
        <AvatarStage3D
          ref={stageRef}
          onReady={() => setReady(true)}
          onError={(m) => setError(`Failed to load avatar: ${m}`)}
        />
      </div>

      <div className="flex w-full max-w-xl items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
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
            onClick={() => {
              if (speechInput.listening) {
                speechInput.stop();
              } else {
                speechInput.start();
              }
            }}
          >
            {speechInput.listening ? (
              <MicOff className="size-4 animate-pulse" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
        <Button onClick={() => void handleSend()} disabled={!ready || !agentId || speaking}>
          {speaking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send
        </Button>
      </div>

      {ready && !agentId && (
        <p className="text-sm text-muted-foreground">
          No active agent found — create one in Agents before using this page.
        </p>
      )}

      <button
        onClick={handleTestSpeak}
        disabled={!ready}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Volume2 className="size-4" />
        Test speak
      </button>
    </div>
  );
}
