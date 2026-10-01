'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, FileText, Paperclip } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HelpAssistantText } from './messages';
import type { HelpAssistantEntry } from './use-help-assistant';

const PROSE =
  'prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1.5 prose-headings:my-2 prose-headings:font-semibold prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:whitespace-pre-wrap prose-pre:text-xs prose-a:text-primary prose-a:underline prose-table:text-xs prose-th:border prose-th:px-2 prose-td:border prose-td:px-2';

export function HelpAssistantMessage({
  entry,
  t,
}: {
  readonly entry: HelpAssistantEntry;
  readonly t: HelpAssistantText;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = entry.role === 'user';

  const copy = () => {
    void navigator.clipboard.writeText(entry.content).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  };

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {entry.attachmentNames && entry.attachmentNames.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1">
          {entry.attachmentNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Paperclip className="size-3" aria-hidden />
              {name}
            </span>
          ))}
        </div>
      )}
      <div
        className={cn(
          'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'whitespace-pre-wrap rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted/60',
        )}
      >
        {isUser ? (
          entry.content
        ) : (
          <div className={PROSE}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {entry.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {!isUser && (
        <div className="flex w-full max-w-[90%] flex-col gap-1">
          {entry.sources && entry.sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
              <span>{t.sources}:</span>
              {entry.sources.map((source) =>
                source.kind === 'web' ? (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-[12rem] items-center gap-0.5 truncate underline underline-offset-2 hover:text-foreground"
                  >
                    <ExternalLink className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{source.title}</span>
                  </a>
                ) : (
                  <span
                    key={source.url}
                    className="inline-flex items-center gap-0.5"
                    title={source.url}
                  >
                    <FileText className="size-3" aria-hidden />
                    {source.title}
                  </span>
                ),
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-fit gap-1 px-1.5 text-[11px] text-muted-foreground"
            onClick={copy}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? t.copied : t.copy}
          </Button>
        </div>
      )}
    </div>
  );
}
