'use client';

import Link from 'next/link';
import { Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useT, type Messages } from '@/lib/i18n';
import type { AdoptionPhaseId } from './adoption-phases';

type Feature = 'delegation' | 'escalations' | 'curation';

interface FeatureCopy {
  readonly title: string;
  readonly description: string;
}

const messages = {
  en: {
    banner: 'TO BE CONSTRUCTED',
    phase: (id: string) => `Phase ${id}`,
    back: 'Go to AI Tools',
    features: {
      delegation: {
        title: 'Delegation Register',
        description:
          'Record which ministry work is delegated to which agent, who the accountable deacon or pastor is, and which human checkpoint approves each output.',
      },
      escalations: {
        title: 'Escalation & Override',
        description:
          'When an agent deviates from its workflow or meets a pastoral red flag, it escalates to a named person who can override, pause or take over — with liability allocated in advance.',
      },
      curation: {
        title: 'Knowledge Curation',
        description:
          'Curate the church’s own trusted corpus — Bible datasets, theological reading, soul-care content and teaching — with provenance and licensing, for agents to draw on.',
      },
    },
  },
  'zh-TW': {
    banner: '建構中',
    phase: (id: string) => `第 ${id} 階段`,
    back: '前往 AI 工具',
    features: {
      delegation: {
        title: '委派登記',
        description:
          '記錄哪些事工委派給哪個代理、由哪位執事或牧者負責，以及由哪個人工檢查點核准每項產出。',
      },
      escalations: {
        title: '升級與覆核',
        description:
          '當代理偏離工作流程或遇到牧養警訊時，會升級給指定負責人，由其覆核、暫停或接手——責任歸屬事先議定。',
      },
      curation: {
        title: '知識整理',
        description:
          '整理教會自有且可信的資料庫——聖經資料集、神學讀物、心靈關顧內容與教導——並標明來源與授權，供代理引用。',
      },
    },
  },
} satisfies Messages<{
  banner: string;
  phase: (id: string) => string;
  back: string;
  features: Record<Feature, FeatureCopy>;
}>;

export function ToBeConstructed({ feature, phase }: { feature: Feature; phase: AdoptionPhaseId }) {
  const t = useT(messages);
  const copy = t.features[feature];
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
      <Card className="max-w-lg text-center">
        <CardHeader className="items-center">
          <Construction className="mb-2 size-8 text-amber-600 dark:text-amber-400" />
          <Badge variant="outline" className="mx-auto mb-2 font-mono tracking-wider">
            {t.phase(phase)} · {t.banner}
          </Badge>
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/ai-tools">{t.back}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
