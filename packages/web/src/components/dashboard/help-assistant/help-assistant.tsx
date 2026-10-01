'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, MessageCircleQuestion, Paperclip, RotateCcw, Send, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { HelpAssistantMessage } from './help-assistant-message';
import { helpAssistantMessages } from './messages';
import { useHelpAssistant } from './use-help-assistant';

const OPEN_KEY = 'help-assistant:open';
const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm';

/**
 * Floating Help Assistant on every dashboard page: explains Light Church's
 * features and helps draft, edit, summarize and search. Opens and closes from
 * the round button at the bottom right; the chat lasts for the browser tab.
 */
export function HelpAssistant() {
  const t = useT(helpAssistantMessages);
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { entries, attachments, sending, uploading, error, send, attach, removeAttachment, reset } =
    useHelpAssistant({ lang, currentPage: pathname });

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem(OPEN_KEY) === 'true');
    } catch {
      /* stays closed */
    }
  }, []);

  const toggle = useCallback((next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(OPEN_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, toggle]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries, sending, open]);

  const submit = async (text: string) => {
    setNotice('');
    const sent = await send(text);
    if (sent) setDraft('');
    else setDraft(text);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const doc = await attach(file);
    setNotice(doc?.truncated ? t.truncated : '');
    if (fileRef.current) fileRef.current.value = '';
    inputRef.current?.focus();
  };

  // The Conversations page has its own send button in the bottom-right corner.
  const lifted = pathname.startsWith('/conversations');

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t.title}
          className={cn(
            'fixed right-4 z-40 flex w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl',
            lifted
              ? 'bottom-40 h-[min(34rem,calc(100dvh-13rem))]'
              : 'bottom-20 h-[min(38rem,calc(100dvh-7rem))]',
          )}
        >
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <MessageCircleQuestion className="size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold leading-tight">{t.title}</h2>
              <p className="truncate text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title={t.newChat}
              aria-label={t.newChat}
              disabled={sending || (entries.length === 0 && attachments.length === 0)}
              onClick={() => {
                reset();
                setNotice('');
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title={t.close}
              aria-label={t.close}
              onClick={() => {
                toggle(false);
              }}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {entries.length === 0 ? (
              <div className="space-y-3">
                <p className="rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
                  {t.welcome}
                </p>
                <p className="text-xs font-medium text-muted-foreground">{t.suggestionsLabel}</p>
                <div className="flex flex-col items-start gap-1.5">
                  {t.suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-full border px-3 py-1 text-left text-xs hover:bg-muted"
                      onClick={() => void submit(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              entries.map((entry) => <HelpAssistantMessage key={entry.id} entry={entry} t={t} />)
            )}
            {sending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t.thinking}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <footer className="space-y-2 border-t px-3 py-2">
            {(error || notice) && (
              <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
                {error || notice}
              </p>
            )}
            {(attachments.length > 0 || uploading) && (
              <div className="flex flex-wrap gap-1">
                {attachments.map((a) => (
                  <span
                    key={a.name}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                  >
                    <Paperclip className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`${t.remove} ${a.name}`}
                      className="rounded hover:text-destructive"
                      onClick={() => {
                        removeAttachment(a.name);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {uploading && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" aria-hidden />
                    {t.reading}
                  </span>
                )}
              </div>
            )}
            <form
              className="flex items-end gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(draft);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                title={`${t.attach} (${t.attachHint})`}
                aria-label={t.attach}
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>
              <Textarea
                ref={inputRef}
                value={draft}
                rows={1}
                placeholder={t.placeholder}
                className="max-h-32 min-h-9 flex-1 resize-none py-2 text-sm"
                onChange={(e) => {
                  setDraft(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void submit(draft);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="size-9 shrink-0"
                aria-label={t.send}
                disabled={sending || draft.trim().length === 0}
              >
                <Send className="size-4" />
              </Button>
            </form>
            <p className="text-[10px] leading-tight text-muted-foreground">{t.privacy}</p>
          </footer>
        </section>
      )}

      <Button
        size="icon"
        className={cn(
          'fixed right-4 z-40 size-12 rounded-full shadow-lg',
          lifted ? 'bottom-24' : 'bottom-4',
        )}
        aria-label={open ? t.close : t.open}
        aria-expanded={open}
        title={open ? t.close : t.open}
        onClick={() => {
          toggle(!open);
        }}
      >
        {open ? <X className="size-5" /> : <MessageCircleQuestion className="size-6" />}
      </Button>
    </>
  );
}
