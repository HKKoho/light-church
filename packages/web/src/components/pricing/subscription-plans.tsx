'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useT, type Messages } from '@/lib/i18n';

type Audience = 'individual' | 'church';

interface PlanText {
  name: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
}

interface PlanMeta {
  id: string;
  href: string;
  featured?: boolean;
}

/** Non-translatable plan data, index-aligned with `messages.*.plans`. */
const PLAN_META: Record<Audience, PlanMeta[]> = {
  individual: [
    { id: 'ind_free', href: '/login' },
    { id: 'ind_supporter', href: '/contribute', featured: true },
  ],
  church: [
    { id: 'church_trial', href: '/login' },
    { id: 'church_pro', href: '/login', featured: true },
  ],
};

interface PlansMessages {
  title: string;
  subtitle: string;
  notice: string;
  individual: string;
  church: string;
  recommended: string;
  plans: Record<Audience, PlanText[]>;
}

const messages = {
  en: {
    title: 'Plans for every kind of ministry',
    subtitle:
      'Whether you are one person exploring AI for your walk with God, or a whole church freeing up staff time, there is a plan for you.',
    notice:
      'Subscriptions are not live yet — this is a preview of planned pricing. You can already sign in and try the dashboard.',
    individual: 'Individual',
    church: 'Church',
    recommended: 'Recommended',
    plans: {
      individual: [
        {
          name: 'Individual Free',
          description: 'For believers starting out with AI for study and prayer.',
          price: 'Free',
          priceNote: 'No credit card required',
          features: [
            'Bible study helper agent',
            'Send prayer requests from web, Telegram or WhatsApp',
            'One AI Tool from the directory',
            'Community support',
          ],
          cta: 'Get started',
        },
        {
          name: 'Individual Supporter',
          description: 'Help keep Light Church free for small churches — and get a few extras.',
          price: 'Give what you can',
          priceNote: 'One-time or monthly',
          features: [
            'Everything in Free',
            'Three AI Tools from the directory',
            'Priority community support',
            'Supporter badge',
          ],
          cta: 'Contribute',
        },
      ],
      church: [
        {
          name: 'Church Trial',
          description: 'Explore the full platform with your team, free for 90 days.',
          price: 'Free for 3 months',
          priceNote: 'No credit card required',
          features: [
            'AI Tools directory',
            'Sermon, worship and admin helper agents',
            'Prayer request inbox',
            'Bilingual dashboard (English / 繁體中文)',
            'Email support',
          ],
          cta: 'Start free trial',
        },
        {
          name: 'Church Pro',
          description: 'The complete toolkit for churches and Christian organisations.',
          price: 'HK$499 / month',
          priceNote: 'Billed monthly, cancel any time',
          features: [
            'Everything in Trial',
            'All helper agents, including mission and NGO specialists',
            'Workflow generation with named reviewers',
            'Church website and venue rental pages',
            'Monthly usage and stewardship report',
            'Dedicated support',
          ],
          cta: 'Choose Pro',
        },
      ],
    },
  },
  'zh-TW': {
    title: '適合每種事工的方案',
    subtitle: '無論你是想用 AI 幫助靈修的個人，還是想為同工騰出時間的整間教會，都有合適的方案。',
    notice: '訂閱尚未正式開放——以下為預計方案。你現在已可登入試用儀表板。',
    individual: '個人',
    church: '教會',
    recommended: '推薦',
    plans: {
      individual: [
        {
          name: '個人免費版',
          description: '適合剛開始以 AI 幫助查經與禱告的信徒。',
          price: '免費',
          priceNote: '無需信用卡',
          features: [
            '查經助理',
            '經網頁、Telegram 或 WhatsApp 提交代禱事項',
            '一個 AI 工具',
            '社群支援',
          ],
          cta: '立即開始',
        },
        {
          name: '個人支持者',
          description: '幫助光教會為小型教會保持免費——並獲得額外福利。',
          price: '隨心奉獻',
          priceNote: '單次或每月',
          features: ['包含免費版所有功能', '三個 AI 工具', '優先社群支援', '支持者徽章'],
          cta: '奉獻支持',
        },
      ],
      church: [
        {
          name: '教會試用版',
          description: '與同工一起免費體驗完整平台，為期 90 天。',
          price: '免費三個月',
          priceNote: '無需信用卡',
          features: [
            'AI 工具目錄',
            '講道、敬拜及行政助理',
            '代禱事項收件匣',
            '雙語儀表板（English / 繁體中文）',
            '電郵支援',
          ],
          cta: '開始免費試用',
        },
        {
          name: '教會專業版',
          description: '為教會及基督教機構提供完整工具。',
          price: 'HK$499 / 月',
          priceNote: '按月收費，可隨時取消',
          features: [
            '包含試用版所有功能',
            '所有助理，包括宣教及 NGO 專家',
            '工作流程生成，每個環節有指定負責人',
            '教會網站及場地租用頁面',
            '每月使用及管家報告',
            '專屬支援',
          ],
          cta: '選擇專業版',
        },
      ],
    },
  },
} satisfies Messages<PlansMessages>;

function PlanCard({
  plan,
  meta,
  recommended,
}: {
  plan: PlanText;
  meta: PlanMeta;
  recommended: string;
}) {
  return (
    <Card className={cn('h-full', meta.featured && 'border-primary shadow-md')}>
      <CardHeader>
        {meta.featured && <Badge className="mb-2 w-fit">{recommended}</Badge>}
        <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-3xl font-bold tracking-tight">{plan.price}</p>
        <p className="mt-1 text-xs text-muted-foreground">{plan.priceNote}</p>
        <ul className="mt-6 space-y-3 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant={meta.featured ? 'default' : 'outline'} asChild>
          <Link href={meta.href}>{plan.cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SubscriptionPlans() {
  const t = useT(messages);
  const [audience, setAudience] = useState<Audience>('individual');
  const audiences: Audience[] = ['individual', 'church'];

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{t.notice}</p>
      </div>

      <div className="mt-10 flex justify-center">
        <div role="tablist" className="inline-flex rounded-full bg-muted p-1">
          {audiences.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={audience === a}
              onClick={() => setAudience(a)}
              className={cn(
                'rounded-full px-6 py-2 text-sm font-medium transition-colors',
                audience === a
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t[a]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PLAN_META[audience].map((meta, i) => {
          const plan = t.plans[audience][i];
          return plan ? (
            <PlanCard key={meta.id} plan={plan} meta={meta} recommended={t.recommended} />
          ) : null;
        })}
      </div>
    </section>
  );
}
