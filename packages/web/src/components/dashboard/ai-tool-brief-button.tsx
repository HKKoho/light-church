'use client';

import { Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLanguage, useT, type Messages } from '@/lib/i18n';
import { AI_TOOL_BRIEFS } from './ai-tool-briefs';
import { BriefPlayer } from './brief-player';

const messages = {
  en: { button: '1-min brief', subtitle: 'How it helps, and how to use it' },
  'zh-TW': { button: '一分鐘簡介', subtitle: '有咩幫助，同點樣使用' },
} satisfies Messages<{ button: string; subtitle: string }>;

interface AiToolBriefButtonProps {
  /** Built-in tool key or uploaded tool folder name (see `AI_TOOL_BRIEFS`). */
  readonly briefKey: string;
  readonly toolName: string;
}

/** Opens a tool's one-minute brief, shown as text and read aloud. */
export function AiToolBriefButton({ briefKey, toolName }: AiToolBriefButtonProps) {
  const t = useT(messages);
  const { lang } = useLanguage();
  const brief = AI_TOOL_BRIEFS[briefKey]?.[lang];
  if (!brief) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`${t.button}: ${toolName}`}>
          <Headphones className="mr-1.5 size-4" />
          {t.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{toolName}</DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>
        <BriefPlayer paragraphs={[brief.helps, ...brief.steps]} numberedFrom={1} />
      </DialogContent>
    </Dialog>
  );
}
