// Recognizes where a service's date sits relative to today's calendar week,
// so the UI can nudge each role toward the right bulletin: officers draft the
// upcoming week ('next'), pastors/deacons approve the imminent one ('coming'),
// and the one just held becomes read-only history ('past'). Reuses the
// bulletin's existing Chinese-numeral `date` field (via parseChineseDate)
// rather than storing a separate date, so there's one source of truth.

import { parseChineseDate } from './chineseDate';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Nearest Sunday on/after `today` — this week's service, i.e. the "coming Sunday".
export function getComingSunday(today: Date = new Date()): Date {
  const d = startOfDay(today);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return d;
}

export function getPastSunday(today: Date = new Date()): Date {
  const d = getComingSunday(today);
  d.setDate(d.getDate() - 7);
  return d;
}

export function getNextSunday(today: Date = new Date()): Date {
  const d = getComingSunday(today);
  d.setDate(d.getDate() + 7);
  return d;
}

export type SundayRelation = 'past' | 'coming' | 'next' | 'earlier' | 'later' | 'unknown';

/** Classifies a bulletin's `date` string against today's coming/past/next Sunday. */
export function classifyServiceDate(dateStr: string | undefined, today: Date = new Date()): SundayRelation {
  const parsed = dateStr ? parseChineseDate(dateStr) : null;
  if (!parsed) return 'unknown';
  const t = startOfDay(parsed).getTime();
  const past = getPastSunday(today).getTime();
  const coming = getComingSunday(today).getTime();
  const next = getNextSunday(today).getTime();
  if (t === past) return 'past';
  if (t === coming) return 'coming';
  if (t === next) return 'next';
  return t < past ? 'earlier' : 'later';
}

export const SUNDAY_RELATION_TAGS: Record<SundayRelation, string> = {
  past: '上主日．存檔',
  coming: '本主日．待審批',
  next: '下主日．準備中',
  earlier: '',
  later: '',
  unknown: '',
};

export const SUNDAY_RELATION_BADGE_CLASSES: Record<SundayRelation, string> = {
  past: 'bg-slate-100 text-slate-600 border border-slate-200',
  coming: 'bg-amber-100 text-amber-800 border border-amber-200',
  next: 'bg-blue-100 text-blue-800 border border-blue-200',
  earlier: 'bg-slate-50 text-slate-400 border border-slate-100',
  later: 'bg-slate-50 text-slate-400 border border-slate-100',
  unknown: 'bg-slate-50 text-slate-400 border border-slate-100',
};

export const SUNDAY_RELATION_MESSAGES: Partial<Record<SundayRelation, { title: string; body: string }>> = {
  past: {
    title: '上主日已過 — 建議存檔',
    body: '此程序表屬於剛過去的主日，崇拜已完成，可留存作記錄，毋須再編輯。',
  },
  coming: {
    title: '本主日即將舉行 — 待審批',
    body: '此為即將到來的主日程序表，請牧師／傳道及執事盡快完成審閱，以便及時發送。',
  },
  next: {
    title: '下主日程序表 — 幹事準備中',
    body: '此為下週主日的程序表，幹事可開始撰寫內容，準備好後提交牧師審閱。',
  },
};
