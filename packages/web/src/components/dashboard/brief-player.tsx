'use client';

import { useEffect, useRef } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBriefSpeech } from '@/hooks/use-brief-speech';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const messages = {
  en: {
    play: 'Play',
    stop: 'Stop',
    unsupported: 'This browser cannot read aloud — the text is below.',
    noVoice:
      'No English voice is installed on this device, so another voice may be used. You can add one in the system’s speech settings.',
  },
  'zh-TW': {
    play: '播放',
    stop: '停止',
    unsupported: '此瀏覽器無法朗讀，請閱讀下方文字。',
    noVoice:
      '此裝置未安裝廣東話語音，或會以其他語音朗讀。可在系統的語音設定加入「廣東話（香港）」語音。',
  },
} satisfies Messages<{
  play: string;
  stop: string;
  unsupported: string;
  noVoice: string;
}>;

interface BriefPlayerProps {
  /** Paragraphs shown and read in order. */
  readonly paragraphs: readonly string[];
  /** Paragraphs from this index on are shown as a numbered list of steps. */
  readonly numberedFrom?: number;
  /** Start reading as soon as it appears (only after a user click). */
  readonly autoPlay?: boolean;
}

/** Text of a brief with a Play/Stop button; the paragraph being read is highlighted. */
export function BriefPlayer({ paragraphs, numberedFrom, autoPlay = false }: BriefPlayerProps) {
  const t = useT(messages);
  const { lang } = useLanguage();
  const speech = useBriefSpeech(lang);
  const { supported, play } = speech;

  // Auto-play once only — `paragraphs` may be a new array on every render.
  const autoPlayed = useRef(false);
  useEffect(() => {
    if (!autoPlay || !supported || autoPlayed.current) return;
    autoPlayed.current = true;
    play(paragraphs);
  }, [autoPlay, supported, play, paragraphs]);

  const split = numberedFrom ?? paragraphs.length;
  const lineClass = (index: number) =>
    cn(
      'rounded-md px-2 py-1 transition-colors',
      speech.current === index && 'bg-sky-500/15 text-foreground',
    );

  return (
    <div className="flex flex-col gap-3">
      {supported ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={speech.playing ? 'secondary' : 'default'}
            onClick={() => (speech.playing ? speech.stop() : play(paragraphs))}
          >
            {speech.playing ? (
              <Square className="mr-2 size-4" />
            ) : (
              <Volume2 className="mr-2 size-4" />
            )}
            {speech.playing ? t.stop : t.play}
          </Button>
          {!speech.hasVoice && <p className="text-xs text-muted-foreground">{t.noVoice}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t.unsupported}</p>
      )}
      <div className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
        {paragraphs.slice(0, split).map((text, i) => (
          <p key={i} className={lineClass(i)}>
            {text}
          </p>
        ))}
        {split < paragraphs.length && (
          <ol className="flex list-decimal flex-col gap-1 pl-6">
            {paragraphs.slice(split).map((text, i) => (
              <li key={i} className={lineClass(split + i)}>
                {text}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
