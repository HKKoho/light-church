// The year's preaching plan (全年主日崇拜講道名單和題目): uploaded once as a
// spreadsheet, kept in localStorage, and applied by date to each bulletin's
// preacher / sermon title / scripture / series, the same way
// rosterSchedule.ts fills the service roster.
//
// Expected layout: one row per Sunday —
//   日期 / 講員 / 講題 / 經文 (optional) / 系列 (optional)

import * as XLSX from 'xlsx';
import { ChurchService, SermonPlanEntry } from '../types/bulletin';
import { parseChineseDate } from './chineseDate';
import { normalizeDateValue, toIsoDate } from './dateNormalize';

const STORAGE_KEY = 'sermonPlan';

const HEADERS = { date: '日期', preacher: '講員', title: '講題', scripture: '經文', series: '系列' } as const;

const HEADER_ALIASES: Record<keyof SermonPlanEntry, string[]> = {
  date: ['日期', '主日', 'date', 'sunday'],
  preacher: ['講員', '講道', '講者', '傳道', 'preacher', 'speaker'],
  title: ['講題', '題目', '主題', 'title', 'topic'],
  scripture: ['經文', 'scripture'],
  series: ['系列', 'series'],
};

type Field = keyof SermonPlanEntry;

function normalize(cell: unknown): string {
  return String(cell ?? '').trim();
}

function buildColumnIndex(headerRow: unknown[]): Partial<Record<Field, number>> {
  const index: Partial<Record<Field, number>> = {};
  headerRow.forEach((cell, i) => {
    const norm = normalize(cell).toLowerCase();
    (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
      if (index[field] === undefined && HEADER_ALIASES[field].some((a) => norm.includes(a.toLowerCase()))) {
        index[field] = i;
      }
    });
  });
  return index;
}

export async function parseSermonPlanFile(file: File): Promise<SermonPlanEntry[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const name = workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : undefined;
  if (!sheet) return [];

  const [headerRow, ...dataRows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (!headerRow) return [];
  const cols = buildColumnIndex(headerRow);
  const cell = (row: unknown[], field: Field) => (cols[field] !== undefined ? normalize(row[cols[field]!]) : '');

  return dataRows
    .map((row): SermonPlanEntry | null => {
      const date = cols.date !== undefined ? normalizeDateValue(row[cols.date]) : null;
      const entry = {
        date: date ?? '',
        preacher: cell(row, 'preacher'),
        title: cell(row, 'title'),
        scripture: cell(row, 'scripture'),
        series: cell(row, 'series'),
      };
      return date && (entry.preacher || entry.title) ? entry : null;
    })
    .filter((e): e is SermonPlanEntry => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Downloads the current plan as .xlsx, or an empty template when there is none yet. */
export function downloadSermonPlan(entries: SermonPlanEntry[]): void {
  const rows = entries.map((e) => ({
    [HEADERS.date]: e.date,
    [HEADERS.preacher]: e.preacher,
    [HEADERS.title]: e.title,
    [HEADERS.scripture]: e.scripture,
    [HEADERS.series]: e.series,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: Object.values(HEADERS) });
  sheet['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '講道名單');
  XLSX.writeFile(workbook, entries.length > 0 ? '全年主日崇拜講道名單和題目.xlsx' : '講道名單範本.xlsx');
}

export function loadSermonPlan(): SermonPlanEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SermonPlanEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveSermonPlan(entries: SermonPlanEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Best-effort, as with the roster schedule.
  }
}

export function applySermonPlanToService(service: ChurchService, plan: SermonPlanEntry[]): ChurchService {
  if (plan.length === 0) return service;
  const serviceDate = parseChineseDate(service.date);
  if (!serviceDate) return service;
  const entry = plan.find((e) => e.date === toIsoDate(serviceDate));
  if (!entry) return service;

  const preacher = entry.preacher || service.preacher;
  const sermonTitle = entry.title || service.sermonTitle;
  return {
    ...service,
    preacher,
    sermonTitle,
    scripture: entry.scripture || service.scripture,
    sermonSeries: entry.series || service.sermonSeries,
    items: service.items.map((item) =>
      item.type === 'sermon' ? { ...item, detail: sermonTitle, leader: preacher } : item
    ),
  };
}
