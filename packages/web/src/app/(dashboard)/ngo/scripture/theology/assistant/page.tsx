'use client';

import { useEffect, useRef, useState, type SyntheticEvent, type KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, RotateCcw, Send } from 'lucide-react';
import type { TheologyAnswer, TheologyAskInput, TheologyAskMode } from '@clawix/shared';
import { THEOLOGY_ASK_MODES } from '@clawix/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useTheologyT } from '../messages';
import {
  API,
  ErrorBanner,
  PageHeader,
  THEOLOGY_PATH,
  errorMessage,
  useTheologyRoles,
} from '../shared';
import { SourcesPanel, sourceAnchor } from './sources-panel';

interface Turn {
  readonly question: string;
  readonly answer: TheologyAnswer;
}

/** "[2]" → a link to source 2 of this turn, rendered by the `a` override below. */
function linkCitations(markdown: string, turn: number): string {
  return markdown.replace(
    /\[(\d{1,2})\](?!\()/g,
    (_m, n: string) => `[[${n}]](#${sourceAnchor(turn, Number(n))})`,
  );
}

/** Staff: ask questions answered from the approved theology library. */
export default function TheologyAssistantPage() {
  const t = useTheologyT();
  const { lang } = useLanguage();
  const { isReader } = useTheologyRoles();
  const [mode, setMode] = useState<TheologyAskMode>('general');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Which answer's sources the panel shows, and which source is highlighted. */
  const [focus, setFocus] = useState<{ turn: number; n: number | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, pending]);

  const ask = async (e?: SyntheticEvent) => {
    e?.preventDefault();
    const q = question.trim();
    if (!q || pending) return;
    setPending(q);
    setQuestion('');
    setError(null);
    setFocus(null);
    const body: TheologyAskInput = {
      question: q,
      mode,
      language: lang,
      history: turns.slice(-6).flatMap((turn) => [
        { role: 'user' as const, content: turn.question },
        { role: 'assistant' as const, content: turn.answer.answer.slice(0, 8000) },
      ]),
    };
    try {
      const res = await authFetch<{ data: TheologyAnswer }>(`${API}/ask`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setTurns((prev) => [...prev, { question: q, answer: res.data }]);
    } catch (err) {
      setError(errorMessage(err, t.failed));
      setQuestion(q);
    } finally {
      setPending(null);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask();
    }
  };

  const shownTurn = focus?.turn ?? turns.length - 1;

  return (
    <div className="flex min-w-0 flex-col gap-4 p-6">
      <PageHeader
        backHref={THEOLOGY_PATH}
        backLabel={t.title}
        title={t.assistantTitle}
        subtitle={t.assistantHint}
      />
      {!isReader ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={mode} onValueChange={(v) => setMode(v as TheologyAskMode)}>
              <TabsList>
                {THEOLOGY_ASK_MODES.map((m) => (
                  <TabsTrigger key={m} value={m}>
                    {t.modes[m]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">{t.modeHints[mode]}</p>
            {turns.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setTurns([]);
                  setFocus(null);
                }}
              >
                <RotateCcw className="size-4" />
                {t.clear}
              </Button>
            )}
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <section className="flex min-w-0 flex-col gap-4">
              {turns.map((turn, i) => (
                <article key={i} className="flex flex-col gap-2">
                  <p className="ml-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
                    {turn.question}
                  </p>
                  <div className="prose prose-sm dark:prose-invert max-w-none min-w-0 break-words">
                    {!turn.answer.grounded && <Badge variant="outline">{t.notGrounded}</Badge>}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => {
                          const m = href?.match(/^#src-(\d+)-(\d+)$/);
                          if (!m) {
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            );
                          }
                          const turnIndex = Number(m[1]);
                          const n = Number(m[2]);
                          return (
                            <a
                              href={href}
                              className="align-super text-[10px] font-semibold text-primary no-underline"
                              onClick={() => setFocus({ turn: turnIndex, n })}
                            >
                              {children}
                            </a>
                          );
                        },
                      }}
                    >
                      {linkCitations(turn.answer.answer, i)}
                    </ReactMarkdown>
                  </div>
                </article>
              ))}
              {pending && (
                <article className="flex flex-col gap-2">
                  <p className="ml-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">
                    {pending}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t.thinking}
                  </p>
                </article>
              )}
              <ErrorBanner message={error} />
              <form onSubmit={ask} className="flex items-end gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t.placeholder}
                  maxLength={2000}
                  rows={2}
                  className="min-h-16 resize-none"
                  aria-label={t.placeholder}
                />
                <Button type="submit" disabled={!question.trim() || !!pending}>
                  <Send className="size-4" />
                  {t.send}
                </Button>
              </form>
              <div ref={endRef} />
            </section>

            <aside className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
              <h2 className="text-sm font-semibold">{t.sources}</h2>
              <SourcesPanel
                turn={shownTurn}
                passages={turns[shownTurn]?.answer.citations ?? []}
                highlighted={focus?.n ?? null}
              />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
