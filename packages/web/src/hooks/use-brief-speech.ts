'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';

// Chinese mode is read in Cantonese; browsers report it as zh-HK, zh_HK or yue.
const SPEECH_LANG: Record<Lang, string> = { en: 'en-US', 'zh-TW': 'zh-HK' };
const VOICE_MATCH: Record<Lang, RegExp> = { en: /^en[-_]/i, 'zh-TW': /^(zh[-_]HK|yue)/i };

/**
 * Splits a paragraph into sentences: Chrome silently stops a single utterance
 * after ~15 seconds, so each sentence is spoken as its own utterance.
 */
export function toSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[。！？；.!?;])\s*/u)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

// The speech API has no gender field, so female voices are recognised by name:
// Edge neural (Aria, Jenny, HiuGaai…), macOS/iOS (Samantha, Ava, Sinji…),
// Windows (Zira, Tracy) and Chrome's Google voices, which are female for en-US and Cantonese.
const FEMALE_VOICE: Record<Lang, RegExp> = {
  en: /\b(Aria|Jenny|Ava|Emma|Michelle|Sonia|Libby|Natasha|Clara|Samantha|Allison|Susan|Zoe|Nicky|Karen|Moira|Tessa|Serena|Fiona|Kate|Victoria|Zira|Hazel|Female)\b|Google US English/i,
  'zh-TW': /\b(HiuGaai|HiuMaan|Sinji|Tracy|Female)\b|Google/i,
};

type VoiceInfo = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>;

/** Higher is better: a female voice first, then neural > premium > enhanced > Google. */
export function voiceScore(voice: VoiceInfo, lang: Lang): number {
  const { name } = voice;
  const quality = /Natural|Neural/i.test(name)
    ? 4
    : /Premium/i.test(name)
      ? 3
      : /Enhanced/i.test(name)
        ? 2
        : /Google/i.test(name)
          ? 1
          : 0;
  return (FEMALE_VOICE[lang].test(name) ? 10 : 0) + quality + (voice.localService ? 0.5 : 0);
}

/** Best-scoring voice for the language, or null when none is installed. */
export function bestVoice<V extends VoiceInfo>(voices: readonly V[], lang: Lang): V | null {
  let best: V | null = null;
  for (const voice of voices) {
    if (!VOICE_MATCH[lang].test(voice.lang)) continue;
    if (!best || voiceScore(voice, lang) > voiceScore(best, lang)) best = voice;
  }
  return best;
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  return bestVoice(window.speechSynthesis.getVoices(), lang);
}

/**
 * Reads a list of paragraphs aloud with the browser's own speech engine — no
 * server round-trip. `current` is the paragraph being read, for highlighting.
 */
export function useBriefSpeech(lang: Lang) {
  const [supported, setSupported] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);
  const [current, setCurrent] = useState<number | null>(null);
  // Bumped on every play/stop so callbacks from a cancelled run are ignored.
  const runRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    // Voices load asynchronously in Chrome; re-check once they arrive.
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) setHasVoice(pickVoice(lang) !== null);
    };
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', check);
    };
  }, [lang]);

  const stop = useCallback(() => {
    runRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrent(null);
  }, []);

  const play = useCallback(
    (paragraphs: readonly string[]) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const run = ++runRef.current;
      const voice = pickVoice(lang);
      const queue = paragraphs.flatMap((p, index) =>
        toSentences(p).map((text) => ({ index, text })),
      );
      queue.forEach(({ index, text }, i) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice?.lang ?? SPEECH_LANG[lang];
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          if (runRef.current === run) setCurrent(index);
        };
        const finish = () => {
          if (runRef.current === run && i === queue.length - 1) setCurrent(null);
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      });
      setCurrent(queue.length > 0 ? 0 : null);
    },
    [lang],
  );

  // Stop speaking when the reader goes away (dialog closed, page left).
  useEffect(() => stop, [stop]);

  return { supported, hasVoice, current, playing: current !== null, play, stop };
}
