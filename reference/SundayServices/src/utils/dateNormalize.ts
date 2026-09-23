// Converts whatever a spreadsheet cell hands back for a date — a JS Date
// (when XLSX.read is called with cellDates: true), a raw Excel serial number
// (fallback), a Gregorian string, or a Chinese-numeral date string — into a
// plain ISO 'YYYY-MM-DD', so schedule dates can be compared against a
// bulletin's own date (via chineseDate.ts) with plain string equality.

import { parseChineseDate } from './chineseDate';

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

export function normalizeDateValue(value: unknown): string | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : toIsoDate(value);
  }

  if (typeof value === 'number' && isFinite(value)) {
    const ms = EXCEL_EPOCH_UTC_MS + value * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    // Re-anchor the UTC-computed instant to a local calendar date.
    return toIsoDate(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  const str = String(value ?? '').trim();
  if (!str) return null;

  const chinese = parseChineseDate(str);
  if (chinese) return toIsoDate(chinese);

  const isoLike = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoLike) {
    const [, y, m, d] = isoLike;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return toIsoDate(date);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
}
