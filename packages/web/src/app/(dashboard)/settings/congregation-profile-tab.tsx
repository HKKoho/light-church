'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AGE_BANDS,
  ECONOMIC_TIERS,
  GOVERNANCE_MODELS,
  type AgeBand,
  type CongregationProfileInput,
  type EconomicTier,
  type GovernanceModel,
} from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { EditableStringList } from '@/components/dashboard/editable-string-list';
import { cn } from '@/lib/utils';
import { useT, type Messages } from '@/lib/i18n';

type AgePctField =
  | 'ageUnder11Pct'
  | 'age11to17Pct'
  | 'age18to24Pct'
  | 'age25to34Pct'
  | 'age35to49Pct'
  | 'age50to74Pct'
  | 'ageOver75Pct';

type EconomicPctField =
  | 'economicPoorPct'
  | 'economicBelowAvgPct'
  | 'economicAveragePct'
  | 'economicAboveAvgPct'
  | 'economicRichPct';

const AGE_FIELD_MAP: Record<AgeBand, AgePctField> = {
  under11: 'ageUnder11Pct',
  '11to17': 'age11to17Pct',
  '18to24': 'age18to24Pct',
  '25to34': 'age25to34Pct',
  '35to49': 'age35to49Pct',
  '50to74': 'age50to74Pct',
  over75: 'ageOver75Pct',
};

const ECONOMIC_FIELD_MAP: Record<EconomicTier, EconomicPctField> = {
  poor: 'economicPoorPct',
  belowAverage: 'economicBelowAvgPct',
  average: 'economicAveragePct',
  aboveAverage: 'economicAboveAvgPct',
  rich: 'economicRichPct',
};

const EMPTY: CongregationProfileInput = {
  governanceModel: 'centralized',
  ageUnder11Pct: 0,
  age11to17Pct: 0,
  age18to24Pct: 0,
  age25to34Pct: 0,
  age35to49Pct: 0,
  age50to74Pct: 0,
  ageOver75Pct: 0,
  economicPoorPct: 0,
  economicBelowAvgPct: 0,
  economicAveragePct: 0,
  economicAboveAvgPct: 0,
  economicRichPct: 0,
  ethnicGroups: [],
  educationLevels: [],
};

const messages = {
  en: {
    governanceSection: 'Church governance model',
    governanceDescription:
      'How pastoral care is organized in this church — changes which nav items are promoted into the sidebar for everyone.',
    governanceModelLabels: {
      centralized: 'Centralized',
      decentralized: 'Decentralized (cell groups)',
    },
    governanceModelDescriptions: {
      centralized: 'A pastor or staff team owns pastoral care top-down.',
      decentralized:
        'Cell/small-group leaders own care for their own group and escalate up as needed.',
    },
    ageSection: 'Age bands',
    ageDescription: 'Percentage of the congregation in each age band.',
    economicSection: 'Economic background',
    economicDescription: 'Percentage of the congregation in each economic tier.',
    ethnicSection: 'Ethnic groups',
    ethnicDescription:
      'The options available when tagging a pastoral-care case. Add, remove, or rename freely.',
    educationSection: 'Education levels',
    educationDescription:
      'The options available when tagging a pastoral-care case. Add, remove, or rename freely.',
    total: (n: number) => `Total: ${n}%`,
    totalWarning: (n: number) => `Total: ${n}% (doesn't add up to 100%)`,
    save: 'Save',
    loadFailed: 'Could not load the congregation profile.',
    saveFailed: 'Could not save — try again.',
    savedTitle: 'Saved',
    savedDescription: 'The congregation profile has been updated.',
    ageBandLabels: {
      under11: 'Under 11',
      '11to17': '11–17',
      '18to24': '18–24',
      '25to34': '25–34',
      '35to49': '35–49',
      '50to74': '50–74',
      over75: '75+',
    },
    economicTierLabels: {
      poor: 'Poor',
      belowAverage: 'Below average',
      average: 'Average',
      aboveAverage: 'Above average',
      rich: 'Rich',
    },
  },
  'zh-TW': {
    governanceSection: '教會治理模式',
    governanceDescription: '本教會牧養關懷的組織方式──會決定側邊欄為所有人顯示哪些功能項目。',
    governanceModelLabels: {
      centralized: '集中式',
      decentralized: '分散式（小組／細胞小組）',
    },
    governanceModelDescriptions: {
      centralized: '由主任牧師或同工團隊由上而下負責牧養關懷。',
      decentralized: '各小組／細胞小組領袖負責自己小組的關懷，並視需要向上呈報。',
    },
    ageSection: '年齡層',
    ageDescription: '會眾各年齡層所佔百分比。',
    economicSection: '經濟背景',
    economicDescription: '會眾各經濟層級所佔百分比。',
    ethnicSection: '族群',
    ethnicDescription: '標記牧養關懷個案時可選用的族群選項，可自由新增、移除或重新命名。',
    educationSection: '教育程度',
    educationDescription: '標記牧養關懷個案時可選用的教育程度選項，可自由新增、移除或重新命名。',
    total: (n: number) => `合計：${n}%`,
    totalWarning: (n: number) => `合計：${n}%（未達 100%）`,
    save: '儲存',
    loadFailed: '無法載入會眾背景資料。',
    saveFailed: '儲存失敗，請再試一次。',
    savedTitle: '已儲存',
    savedDescription: '會眾背景設定已更新。',
    ageBandLabels: {
      under11: '11歲以下',
      '11to17': '11至17歲',
      '18to24': '18至24歲',
      '25to34': '25至34歲',
      '35to49': '35至49歲',
      '50to74': '50至74歲',
      over75: '75歲以上',
    },
    economicTierLabels: {
      poor: '貧困',
      belowAverage: '中低收入',
      average: '中等收入',
      aboveAverage: '中高收入',
      rich: '富裕',
    },
  },
} satisfies Messages<{
  governanceSection: string;
  governanceDescription: string;
  governanceModelLabels: Record<GovernanceModel, string>;
  governanceModelDescriptions: Record<GovernanceModel, string>;
  ageSection: string;
  ageDescription: string;
  economicSection: string;
  economicDescription: string;
  ethnicSection: string;
  ethnicDescription: string;
  educationSection: string;
  educationDescription: string;
  total: (n: number) => string;
  totalWarning: (n: number) => string;
  save: string;
  loadFailed: string;
  saveFailed: string;
  savedTitle: string;
  savedDescription: string;
  ageBandLabels: Record<AgeBand, string>;
  economicTierLabels: Record<EconomicTier, string>;
}>;

interface ApiResponse {
  readonly success: boolean;
  readonly data: CongregationProfileInput;
}

function PctInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 pr-6"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );
}

export function CongregationProfileTab() {
  const t = useT(messages);
  const [form, setForm] = useState<CongregationProfileInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch<ApiResponse>('/admin/congregation-profile');
      setForm(res.data);
    } catch {
      setError(t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await authFetch<ApiResponse>('/admin/congregation-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm(res.data);
      setSaved(true);
    } catch {
      setError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ageTotal = AGE_BANDS.reduce<number>((sum, band) => sum + form[AGE_FIELD_MAP[band]], 0);
  const economicTotal = ECONOMIC_TIERS.reduce<number>(
    (sum, tier) => sum + form[ECONOMIC_FIELD_MAP[tier]],
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.governanceSection}</CardTitle>
          <CardDescription>{t.governanceDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {GOVERNANCE_MODELS.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => setForm((f) => ({ ...f, governanceModel: model }))}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                form.governanceModel === model
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <span className="text-sm font-medium">{t.governanceModelLabels[model]}</span>
              <span className="text-xs text-muted-foreground">
                {t.governanceModelDescriptions[model]}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {t.ageSection}
            <span
              className={
                ageTotal === 100
                  ? 'font-mono text-xs text-muted-foreground'
                  : 'font-mono text-xs text-amber-600 dark:text-amber-400'
              }
            >
              {ageTotal === 100 ? t.total(ageTotal) : t.totalWarning(ageTotal)}
            </span>
          </CardTitle>
          <CardDescription>{t.ageDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AGE_BANDS.map((band) => (
            <PctInput
              key={band}
              label={t.ageBandLabels[band]}
              value={form[AGE_FIELD_MAP[band]]}
              onChange={(value) => setForm((f) => ({ ...f, [AGE_FIELD_MAP[band]]: value }))}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            {t.economicSection}
            <span
              className={
                economicTotal === 100
                  ? 'font-mono text-xs text-muted-foreground'
                  : 'font-mono text-xs text-amber-600 dark:text-amber-400'
              }
            >
              {economicTotal === 100 ? t.total(economicTotal) : t.totalWarning(economicTotal)}
            </span>
          </CardTitle>
          <CardDescription>{t.economicDescription}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ECONOMIC_TIERS.map((tier) => (
            <PctInput
              key={tier}
              label={t.economicTierLabels[tier]}
              value={form[ECONOMIC_FIELD_MAP[tier]]}
              onChange={(value) => setForm((f) => ({ ...f, [ECONOMIC_FIELD_MAP[tier]]: value }))}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.ethnicSection}</CardTitle>
          <CardDescription>{t.ethnicDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <EditableStringList
            items={form.ethnicGroups}
            onChange={(ethnicGroups) => setForm((f) => ({ ...f, ethnicGroups: [...ethnicGroups] }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.educationSection}</CardTitle>
          <CardDescription>{t.educationDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <EditableStringList
            items={form.educationLevels}
            onChange={(educationLevels) =>
              setForm((f) => ({ ...f, educationLevels: [...educationLevels] }))
            }
          />
        </CardContent>
      </Card>

      <div>
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t.save}
        </Button>
      </div>

      <SuccessDialog
        open={saved}
        onOpenChange={setSaved}
        title={t.savedTitle}
        description={t.savedDescription}
      />
    </div>
  );
}
