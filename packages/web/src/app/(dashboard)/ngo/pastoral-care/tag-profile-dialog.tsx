'use client';

import { useEffect, useState } from 'react';
import { Loader2, Tag } from 'lucide-react';
import {
  AGE_BANDS,
  ECONOMIC_TIERS,
  MBTI_TYPES,
  ENNEAGRAM_TYPES,
  type AgeBand,
  type EconomicTier,
  type EnneagramType,
  type FileEntry,
} from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT, type Messages } from '@/lib/i18n';

const NONE = '__none__';

const messages = {
  en: {
    tagProfile: 'Tag serving-party profile',
    description:
      'Optional, coarse demographic tags for ministry reporting — no real identity involved. Leave any field unset if unknown.',
    ageBand: 'Age band',
    economicTier: 'Economic background',
    ethnicGroup: 'Ethnic group',
    educationLevel: 'Education level',
    demographicSection: 'Demographic (for ministry reporting)',
    personalitySection: 'Personality (for pastoral approach — optional, self-reported only)',
    mbtiType: 'MBTI type',
    enneagramType: 'Enneagram type',
    selectPlaceholder: 'Not set',
    none: 'Not set',
    cancel: 'Cancel',
    save: 'Save tags',
    saveFailed: 'Could not save — try reopening the file and tagging again.',
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
    enneagramLabels: {
      type1: '1 — The Reformer',
      type2: '2 — The Helper',
      type3: '3 — The Achiever',
      type4: '4 — The Individualist',
      type5: '5 — The Investigator',
      type6: '6 — The Loyalist',
      type7: '7 — The Enthusiast',
      type8: '8 — The Challenger',
      type9: '9 — The Peacemaker',
    },
  },
  'zh-TW': {
    tagProfile: '標記服事對象背景',
    description: '選填、粗略的人口背景標記，供事工統計使用 — 不涉及真實身分。不確定的欄位可留空。',
    ageBand: '年齡層',
    economicTier: '經濟背景',
    ethnicGroup: '族群',
    educationLevel: '教育程度',
    demographicSection: '人口背景（供事工統計）',
    personalitySection: '性格類型（供牧養方式參考 — 選填，僅限當事人自述）',
    mbtiType: 'MBTI 類型',
    enneagramType: '九型人格',
    selectPlaceholder: '未設定',
    none: '未設定',
    cancel: '取消',
    save: '儲存標記',
    saveFailed: '儲存失敗 — 請重新開啟檔案再試一次。',
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
    enneagramLabels: {
      type1: '1號 — 改革者',
      type2: '2號 — 助人者',
      type3: '3號 — 成就者',
      type4: '4號 — 個人主義者',
      type5: '5號 — 觀察者',
      type6: '6號 — 忠誠者',
      type7: '7號 — 享樂者',
      type8: '8號 — 挑戰者',
      type9: '9號 — 和平者',
    },
  },
} satisfies Messages<{
  tagProfile: string;
  description: string;
  ageBand: string;
  economicTier: string;
  ethnicGroup: string;
  educationLevel: string;
  demographicSection: string;
  personalitySection: string;
  mbtiType: string;
  enneagramType: string;
  selectPlaceholder: string;
  none: string;
  cancel: string;
  save: string;
  saveFailed: string;
  ageBandLabels: Record<AgeBand, string>;
  economicTierLabels: Record<EconomicTier, string>;
  enneagramLabels: Record<EnneagramType, string>;
}>;

interface CongregationListsResponse {
  readonly success: boolean;
  readonly data: {
    readonly ethnicGroups: readonly string[];
    readonly educationLevels: readonly string[];
  };
}

export function TagProfileDialog({ entry, onTagged }: { entry: FileEntry; onTagged: () => void }) {
  const t = useT(messages);
  const [open, setOpen] = useState(false);
  const [ethnicGroups, setEthnicGroups] = useState<readonly string[]>([]);
  const [educationLevels, setEducationLevels] = useState<readonly string[]>([]);
  const [ageBand, setAgeBand] = useState(NONE);
  const [economicTier, setEconomicTier] = useState(NONE);
  const [ethnicGroup, setEthnicGroup] = useState(NONE);
  const [educationLevel, setEducationLevel] = useState(NONE);
  const [mbtiType, setMbtiType] = useState(NONE);
  const [enneagramType, setEnneagramType] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const res = await authFetch<CongregationListsResponse>('/admin/congregation-profile');
        setEthnicGroups(res.data.ethnicGroups);
        setEducationLevels(res.data.educationLevels);
      } catch {
        // Ethnic/education options just won't populate — age/economic tags still work.
      }
    })();
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    const updates: Record<string, string> = {};
    if (ageBand !== NONE) updates['ageBand'] = ageBand;
    if (economicTier !== NONE) updates['economicTier'] = economicTier;
    if (ethnicGroup !== NONE) updates['ethnicGroup'] = ethnicGroup;
    if (educationLevel !== NONE) updates['educationLevel'] = educationLevel;
    if (mbtiType !== NONE) updates['mbtiType'] = mbtiType;
    if (enneagramType !== NONE) updates['enneagramType'] = enneagramType;

    try {
      await authFetch('/api/v1/workspace/files/frontmatter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: entry.path,
          updates,
          expectedModifiedAt: entry.modifiedAt,
        }),
      });
      setOpen(false);
      onTagged();
    } catch {
      setError(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-6 shrink-0" title={t.tagProfile}>
          <Tag className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.tagProfile}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {t.demographicSection}
          </span>
          <div className="flex flex-col gap-1.5">
            <Label>{t.ageBand}</Label>
            <Select value={ageBand} onValueChange={setAgeBand}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {AGE_BANDS.map((band) => (
                  <SelectItem key={band} value={band}>
                    {t.ageBandLabels[band]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.economicTier}</Label>
            <Select value={economicTier} onValueChange={setEconomicTier}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {ECONOMIC_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {t.economicTierLabels[tier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.ethnicGroup}</Label>
            <Select value={ethnicGroup} onValueChange={setEthnicGroup}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {ethnicGroups.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.educationLevel}</Label>
            <Select value={educationLevel} onValueChange={setEducationLevel}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {educationLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {t.personalitySection}
          </span>

          <div className="flex flex-col gap-1.5">
            <Label>{t.mbtiType}</Label>
            <Select value={mbtiType} onValueChange={setMbtiType}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {MBTI_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t.enneagramType}</Label>
            <Select value={enneagramType} onValueChange={setEnneagramType}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{t.none}</SelectItem>
                {ENNEAGRAM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t.enneagramLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t.cancel}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
