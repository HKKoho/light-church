'use client';

import { useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { HandHeart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useT, type Messages } from '@/lib/i18n';

type Frequency = 'once' | 'monthly';

const PRESET_AMOUNTS = [100, 300, 500, 1000];
const FUNDS = ['general', 'smallChurch', 'translation'] as const;
type Fund = (typeof FUNDS)[number];

const messages = {
  en: {
    title: 'Support Light Church',
    subtitle:
      'Your gift keeps Light Church free for small churches, funds translation into more languages, and pays for the servers that keep church data private.',
    notice:
      'Online giving is not connected yet. You can fill in this form to preview it — no payment will be taken.',
    frequency: 'How often?',
    once: 'One-time',
    monthly: 'Monthly',
    amount: 'Amount (HKD)',
    customAmount: 'Other amount',
    fund: 'Where should it go?',
    funds: {
      general: 'Where it is needed most',
      smallChurch: 'Sponsor a small church’s subscription',
      translation: 'Translation and accessibility',
    } satisfies Record<Fund, string>,
    name: 'Name (optional)',
    email: 'Email for receipt (optional)',
    message: 'Message or prayer (optional)',
    submit: (amount: string, monthly: boolean) =>
      monthly ? `Give HK$${amount} monthly` : `Give HK$${amount}`,
    chooseAmount: 'Choose an amount',
    thanksTitle: 'Thank you for your generosity',
    thanksBody: (amount: string, monthly: boolean, fund: string) =>
      `You chose to give HK$${amount}${monthly ? ' every month' : ''} towards “${fund}”. Payment processing isn’t connected yet, so no money has been taken.`,
    giveAgain: 'Change my gift',
    seePlans: 'See subscription plans',
    verse:
      '“Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.” — 2 Corinthians 9:7',
  },
  'zh-TW': {
    title: '支持光教會',
    subtitle:
      '你的奉獻讓光教會能為小型教會保持免費、翻譯成更多語言，並支付保障教會資料私隱的伺服器費用。',
    notice: '網上奉獻尚未連接。你可以填寫此表格預覽——不會收取任何款項。',
    frequency: '奉獻頻率',
    once: '單次',
    monthly: '每月',
    amount: '金額（港幣）',
    customAmount: '其他金額',
    fund: '奉獻用途',
    funds: {
      general: '最有需要的地方',
      smallChurch: '資助小型教會訂閱',
      translation: '翻譯及無障礙',
    },
    name: '姓名（選填）',
    email: '收據電郵（選填）',
    message: '留言或代禱（選填）',
    submit: (amount: string, monthly: boolean) =>
      monthly ? `每月奉獻 HK$${amount}` : `奉獻 HK$${amount}`,
    chooseAmount: '請選擇金額',
    thanksTitle: '感謝你的慷慨',
    thanksBody: (amount: string, monthly: boolean, fund: string) =>
      `你選擇${monthly ? '每月' : ''}奉獻 HK$${amount}，用於「${fund}」。網上付款尚未連接，因此沒有收取任何款項。`,
    giveAgain: '修改奉獻',
    seePlans: '查看訂閱方案',
    verse:
      '「各人要隨本心所酌定的，不要作難，不要勉強，因為捐得樂意的人是神所喜愛的。」— 哥林多後書 9:7',
  },
} satisfies Messages<{
  title: string;
  subtitle: string;
  notice: string;
  frequency: string;
  once: string;
  monthly: string;
  amount: string;
  customAmount: string;
  fund: string;
  funds: Record<Fund, string>;
  name: string;
  email: string;
  message: string;
  submit: (amount: string, monthly: boolean) => string;
  chooseAmount: string;
  thanksTitle: string;
  thanksBody: (amount: string, monthly: boolean, fund: string) => string;
  giveAgain: string;
  seePlans: string;
  verse: string;
}>;

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  );
}

export function ContributionForm() {
  const t = useT(messages);
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [preset, setPreset] = useState<number | null>(PRESET_AMOUNTS[1] ?? null);
  const [custom, setCustom] = useState('');
  const [fund, setFund] = useState<Fund>('general');
  const [submitted, setSubmitted] = useState(false);

  const customValue = Number(custom);
  const amount = custom !== '' && customValue > 0 ? customValue : preset;
  const amountText = amount ? amount.toLocaleString('en-HK') : '';
  const monthly = frequency === 'monthly';

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    if (amount) setSubmitted(true);
  };

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HandHeart className="size-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-4 text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{t.notice}</p>
      </div>

      <Card className="mt-8">
        {submitted ? (
          <>
            <CardHeader>
              <h2 className="text-xl font-semibold">{t.thanksTitle}</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                {t.thanksBody(amountText, monthly, t.funds[fund])}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  {t.giveAgain}
                </Button>
                <Button asChild>
                  <Link href="/subscription">{t.seePlans}</Link>
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t.frequency}</legend>
                <div className="flex gap-2">
                  <ToggleChip active={!monthly} onClick={() => setFrequency('once')}>
                    {t.once}
                  </ToggleChip>
                  <ToggleChip active={monthly} onClick={() => setFrequency('monthly')}>
                    {t.monthly}
                  </ToggleChip>
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t.amount}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRESET_AMOUNTS.map((value) => (
                    <ToggleChip
                      key={value}
                      active={custom === '' && preset === value}
                      onClick={() => {
                        setPreset(value);
                        setCustom('');
                      }}
                    >
                      HK${value.toLocaleString('en-HK')}
                    </ToggleChip>
                  ))}
                </div>
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder={t.customAmount}
                  aria-label={t.customAmount}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="fund">{t.fund}</Label>
                <select
                  id="fund"
                  value={fund}
                  onChange={(e) => setFund(e.target.value as Fund)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {FUNDS.map((f) => (
                    <option key={f} value={f}>
                      {t.funds[f]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="giver-name">{t.name}</Label>
                  <Input id="giver-name" autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giver-email">{t.email}</Label>
                  <Input id="giver-email" type="email" autoComplete="email" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="giver-message">{t.message}</Label>
                <Textarea id="giver-message" rows={3} />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={!amount}>
                {amount ? t.submit(amountText, monthly) : t.chooseAmount}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <p className="mt-8 text-center text-sm italic text-muted-foreground">{t.verse}</p>
    </section>
  );
}
