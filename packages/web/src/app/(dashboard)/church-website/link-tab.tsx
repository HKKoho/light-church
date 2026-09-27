'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useChurchWebT } from './messages';

/** Content managed in a separate app; these tabs link out to it. */
export const LINK_TABS = {
  getInBible: 'https://getinbible.vercel.app/admin',
  culture: 'https://christianplatform.vercel.app/',
} as const;

export function LinkTab({ tab }: { tab: keyof typeof LINK_TABS }) {
  const t = useChurchWebT();
  const href = LINK_TABS[tab];
  return (
    <Card className="max-w-2xl gap-3">
      <CardHeader>
        <CardTitle className="text-base">{t.tabs[tab]}</CardTitle>
        <CardDescription>{t.links[tab]}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <a href={href} target="_blank" rel="noopener noreferrer">
            {t.open}
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <span className="truncate text-xs text-muted-foreground">{href}</span>
      </CardContent>
    </Card>
  );
}
