'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { TalkingHead as TalkingHeadType } from '@met4citizen/talkinghead';

/**
 * Milestone-1 placeholder avatar. Ready Player Me demo assets are
 * CC BY-NC — fine for this render smoke test, but must be swapped for a
 * properly licensed model before any commercial use.
 */
const DEMO_AVATAR_URL =
  'https://cdn.jsdelivr.net/gh/met4citizen/TalkingHead@1.7/avatars/brunette.glb';

export interface SpeakParams {
  readonly audio: AudioBuffer;
  readonly words: string[];
  readonly wtimes: number[];
  readonly wdurations: number[];
}

export interface AvatarStageHandle {
  /** Speaks a short line using synthetic viseme timings — useful as an offline smoke test. */
  speakTestPhrase: () => void;
  /**
   * Speaks real TTS audio. Visemes are deliberately omitted — TalkingHead's
   * built-in `lipsync-en` module (loaded via `lipsyncModules: ['en']` below)
   * derives them from `words`/`wtimes`/`wdurations` alone.
   */
  speak: (params: SpeakParams) => void;
}

interface AvatarStage3DProps {
  onReady?: () => void;
  onError?: (message: string) => void;
}

/** Builds a silent AudioBuffer just long enough to drive the viseme queue's timing. */
function buildSilentBuffer(ctx: AudioContext, durationMs: number): AudioBuffer {
  const frameCount = Math.ceil((durationMs / 1000) * ctx.sampleRate);
  return ctx.createBuffer(1, frameCount, ctx.sampleRate);
}

export const AvatarStage3D = forwardRef<AvatarStageHandle, AvatarStage3DProps>(
  function AvatarStage3D({ onReady, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<TalkingHeadType | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let disposed = false;

      void (async () => {
        if (!containerRef.current) return;
        try {
          const { TalkingHead } = await import('@met4citizen/talkinghead');
          if (disposed || !containerRef.current) return;

          const head = new TalkingHead(containerRef.current, {
            ttsEndpoint: '', // no built-in TTS — audio is generated server-side (Piper) and pushed via speakAudio()
            lipsyncModules: ['en'],
            cameraView: 'head',
            avatarMood: 'neutral',
          });

          await head.showAvatar({
            url: DEMO_AVATAR_URL,
            body: 'F',
            avatarMood: 'neutral',
            lipsyncLang: 'en',
          });
          if (disposed) return;

          headRef.current = head;
          head.start();
          setLoading(false);
          onReady?.();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load avatar';
          onError?.(message);
        }
      })();

      return () => {
        disposed = true;
        headRef.current?.stop();
        headRef.current?.dispose();
        headRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      speakTestPhrase: () => {
        const head = headRef.current;
        if (!head) return;
        const ctx = new AudioContext();
        head.speakAudio({
          audio: buildSilentBuffer(ctx, 1600),
          words: ['Hello', 'from', 'Clawix'],
          wtimes: [0, 400, 700],
          wdurations: [350, 250, 500],
          visemes: ['sil', 'HH', 'E', 'sil', 'f', 'r', 'aa', 'CH', 'sil'],
          vtimes: [0, 50, 200, 380, 420, 550, 650, 900, 1400],
          vdurations: [50, 150, 150, 40, 130, 100, 250, 400, 200],
        });
      },
      speak: ({ audio, words, wtimes, wdurations }) => {
        headRef.current?.speakAudio({ audio, words, wtimes, wdurations });
      },
    }));

    return (
      <div className="relative h-full w-full overflow-hidden rounded-lg border border-border/60 bg-black/90">
        <div ref={containerRef} className="h-full w-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading avatar…
          </div>
        )}
      </div>
    );
  },
);
