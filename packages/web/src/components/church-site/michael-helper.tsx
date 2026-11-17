'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { Loader2, MessageCircleQuestion, Send, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import {
  WISDOM_MICHAEL_MAX_HISTORY,
  WISDOM_MICHAEL_MAX_QUESTION,
  type WisdomLessonStep,
  type WisdomMichaelMessage,
  type WisdomMichaelReply,
} from '@clawix/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useWisdomSiteT } from './wisdom-messages';

const PROSE =
  'prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5';

interface Entry extends WisdomMichaelMessage {
  /** Error notices are shown but not sent back as conversation. */
  readonly failed?: boolean;
}

/**
 * Michael, the lesson teaching assistant (from GetinBible): a collapsible chat
 * about the step the member is on. The conversation lives only in the page
 * and starts fresh on each step; the panel stays open across steps.
 */
export function MichaelHelper({ moduleId, step }: { moduleId: string; step: WisdomLessonStep }) {
  const t = useWisdomSiteT().michael;
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
    setEntries([]);
    setQuestion('');
    setBusy(false);
  }, [step]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries, busy]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = entries
      .filter((e) => !e.failed)
      .slice(-WISDOM_MICHAEL_MAX_HISTORY)
      .map(({ role, content }) => ({ role, content: content.slice(0, 2000) }));
    setEntries((list) => [...list, { role: 'user', content: q }]);
    setQuestion('');
    setBusy(true);
    // A reply that lands after the member moved to another step is dropped.
    const current = () => stepRef.current === step;
    try {
      const res = await authFetch<{ data: WisdomMichaelReply }>(
        `/api/v1/wisdom/modules/${moduleId}/michael`,
        { method: 'POST', body: JSON.stringify({ step, question: q, history, lang }) },
      );
      if (current()) {
        setEntries((list) => [...list, { role: 'assistant', content: res.data.reply }]);
      }
    } catch {
      if (current()) {
        setEntries((list) => [...list, { role: 'assistant', content: t.failed, failed: true }]);
      }
    } finally {
      if (current()) setBusy(false);
    }
  };

  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    void ask(question);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(question);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <MessageCircleQuestion className="size-4" />
        {t.open}
      </Button>
    );
  }

  return (
    <section
      aria-label={t.title}
      className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <MessageCircleQuestion className="size-5 text-primary" />
            {t.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t.close}>
          <X className="size-4" />
        </Button>
      </div>

      {(entries.length > 0 || busy) && (
        <div ref={listRef} className="flex max-h-96 flex-col gap-2 overflow-y-auto" role="log">
          {entries.map((e, i) => (
            <div
              key={i}
              className={cn(
                'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                e.role === 'user'
                  ? 'self-end whitespace-pre-wrap rounded-br-sm bg-primary text-primary-foreground'
                  : 'self-start rounded-bl-sm bg-background',
                e.failed && 'text-destructive',
              )}
            >
              {e.role === 'user' ? (
                e.content
              ) : (
                <div className={PROSE}>
                  <ReactMarkdown remarkPlugins={[remarkBreaks]}>{e.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              {t.thinking}
            </p>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <button
          type="button"
          onClick={() => void ask(t.hints[step])}
          disabled={busy}
          className="self-start rounded-full border bg-background px-3 py-1 text-left text-sm hover:border-primary"
        >
          {t.hints[step]}
        </button>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t.placeholder}
          maxLength={WISDOM_MICHAEL_MAX_QUESTION}
          rows={2}
          className="bg-background"
          aria-label={t.placeholder}
        />
        <Button type="submit" disabled={busy || !question.trim()} aria-label={t.send}>
          <Send className="size-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{t.note}</p>
    </section>
  );
}
