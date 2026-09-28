'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Minus, Plus, Square, Volume2 } from 'lucide-react';
import type { ActivityContent } from '@clawix/shared';
import { useCompanionT } from './messages';
import { noteKey, type CompanionState } from './use-device-state';

type Devotional = ActivityContent['devotionals'][number];

const hasCjk = (text: string) => /[㐀-鿿]/.test(text);

/** Reads a prayer aloud with the browser's speech synthesis, where available. */
function ReadAloud({ text }: { text: string }) {
  const t = useCompanionT();
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => () => void (supported && window.speechSynthesis.cancel()), [supported]);
  if (!supported) return null;
  const toggle = () => {
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = hasCjk(text) ? 'zh-HK' : 'en-US';
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-full border border-emerald-700/30 px-2.5 py-0.5 text-xs text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
    >
      {speaking ? <Square className="size-3" /> : <Volume2 className="size-3.5" />}
      {speaking ? t.stopReading : t.readAloud}
    </button>
  );
}

export function DevotionalTab({
  devotionals,
  state,
  onState,
  dayIndex,
  onDayIndex,
}: {
  devotionals: readonly Devotional[];
  state: CompanionState;
  onState: (next: CompanionState) => void;
  dayIndex: number;
  onDayIndex: (i: number) => void;
}) {
  const t = useCompanionT();
  const d = devotionals[Math.min(dayIndex, devotionals.length - 1)];
  if (!d) return <p className="text-sm text-muted-foreground">{t.noDevotionals}</p>;

  const isRead = state.daysRead.includes(d.day);
  const toggleRead = () =>
    onState({
      ...state,
      daysRead: isRead ? state.daysRead.filter((n) => n !== d.day) : [...state.daysRead, d.day],
    });
  const setFont = (delta: number) =>
    onState({ ...state, fontSize: Math.min(24, Math.max(13, state.fontSize + delta)) });
  const setNote = (q: number, text: string) =>
    onState({ ...state, notes: { ...state.notes, [noteKey(d.day, q)]: text } });

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <aside className="flex gap-1.5 overflow-x-auto pb-1 md:w-44 md:shrink-0 md:flex-col md:overflow-visible">
        {devotionals.map((dv, i) => {
          const active = dv === d;
          const done = state.daysRead.includes(dv.day);
          return (
            <button
              key={dv.day}
              type="button"
              onClick={() => onDayIndex(i)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                active
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-stone-200 bg-white hover:border-emerald-600 dark:border-stone-700 dark:bg-stone-900'
              }`}
            >
              {done ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <Circle className="size-4 shrink-0 opacity-50" />
              )}
              <span className="flex flex-col">
                <span className="font-medium">{t.day(dv.day)}</span>
                <span className={`line-clamp-1 text-xs ${active ? 'opacity-80' : 'opacity-60'}`}>
                  {dv.title}
                </span>
              </span>
            </button>
          );
        })}
      </aside>

      <article
        className="flex min-w-0 flex-1 flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900"
        style={{ fontSize: state.fontSize }}
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-700">
          <div>
            <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {t.day(d.day)}
            </span>
            <h2 className="mt-1.5 font-serif text-[1.4em] font-bold text-emerald-900 dark:text-emerald-200">
              {d.title}
            </h2>
            {d.scriptureRef && (
              <p className="text-[0.85em] text-emerald-700 dark:text-emerald-400">
                {d.scriptureRef}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <button
              type="button"
              aria-label={t.fontSmaller}
              title={t.fontSmaller}
              onClick={() => setFont(-1)}
              className="rounded-md border p-1.5 hover:bg-muted"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={t.fontLarger}
              title={t.fontLarger}
              onClick={() => setFont(1)}
              className="rounded-md border p-1.5 hover:bg-muted"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleRead}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 ${
                isRead ? 'border-emerald-700 bg-emerald-700 text-white' : 'hover:border-emerald-600'
              }`}
            >
              <CheckCircle2 className="size-4" />
              {isRead ? t.read : t.markRead}
            </button>
          </div>
        </header>

        {d.scriptureText && (
          <blockquote className="whitespace-pre-wrap rounded-xl border-l-4 border-emerald-700/60 bg-stone-50 p-4 font-serif italic leading-relaxed dark:bg-stone-800/60">
            {d.scriptureText}
          </blockquote>
        )}
        {d.guide && <p className="whitespace-pre-wrap leading-relaxed">{d.guide}</p>}

        {d.reflections.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">{t.reflect}</h3>
            {d.reflections.map((q, i) => (
              <label key={i} className="flex flex-col gap-1.5">
                <span className="text-[0.95em]">
                  {i + 1}. {q}
                </span>
                <textarea
                  rows={2}
                  value={state.notes[noteKey(d.day, i)] ?? ''}
                  placeholder={t.yourNote}
                  onChange={(e) => setNote(i, e.target.value)}
                  className="w-full resize-y rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
              </label>
            ))}
          </section>
        )}

        {d.prayer && (
          <section className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">{t.prayer}</h3>
              <ReadAloud text={d.prayer} />
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{d.prayer}</p>
          </section>
        )}
        <p className="text-xs text-muted-foreground">{t.savedOnDevice}</p>
      </article>
    </div>
  );
}
