'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublishedLinkProps {
  readonly label: string;
  readonly url: string;
  readonly copyLabel: string;
  readonly copiedLabel: string;
  readonly openLabel: string;
}

/** A published link (Google Form, Vercel page) with copy and open buttons. */
export function PublishedLink({
  label,
  url,
  copyLabel,
  copiedLabel,
  openLabel,
}: PublishedLinkProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm text-primary underline-offset-2 hover:underline"
        >
          {url}
        </a>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? copiedLabel : copyLabel}
        </Button>
        <Button asChild size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            {openLabel}
          </a>
        </Button>
      </div>
    </div>
  );
}
