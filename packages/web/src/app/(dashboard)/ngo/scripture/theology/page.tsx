'use client';

import Link from 'next/link';
import { Library, MessagesSquare, Network, UserRound, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheologyT } from './messages';
import { PageHeader, THEOLOGY_PATH, useTheologyRoles } from './shared';

type CardKey = 'assistant' | 'library' | 'journey' | 'pastor';

// Mirrors AITheologyPlatform's landing: one card per study tool. Journey
// (knowledge graph) and Pastor's Teaching (opt-in digital twin) come later.
const CARDS: readonly { key: CardKey; icon: LucideIcon; href: string | null }[] = [
  { key: 'assistant', icon: MessagesSquare, href: `${THEOLOGY_PATH}/assistant` },
  { key: 'library', icon: Library, href: `${THEOLOGY_PATH}/library` },
  { key: 'journey', icon: Network, href: null },
  { key: 'pastor', icon: UserRound, href: null },
];

/** Staff: Theology Platform home. */
export default function TheologyPlatformPage() {
  const t = useTheologyT();
  const { isReader } = useTheologyRoles();

  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      <PageHeader
        backHref="/ngo/scripture"
        backLabel={t.back}
        title={t.title}
        subtitle={t.subtitle}
      />
      {!isReader ? (
        <p className="text-sm text-muted-foreground">{t.noAccess}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {CARDS.map(({ key, icon: Icon, href }) => (
            <Card key={key} className={href ? 'gap-3 py-4' : 'gap-3 py-4 opacity-70'}>
              <CardHeader className="px-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 text-muted-foreground" />
                  {t.cards[key].name}
                  {!href && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {t.later}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{t.cards[key].description}</CardDescription>
              </CardHeader>
              {href && (
                <CardContent className="px-4">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={href}>{t.open}</Link>
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
