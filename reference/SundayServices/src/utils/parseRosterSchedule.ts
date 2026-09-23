// Imports a multi-week service-people arrangement schedule from an .xlsx
// workbook — a much longer-lived document than the per-bulletin roster
// import in parseBulletinExcel.ts, meant to be uploaded once (or whenever
// the arrangement changes) and cover as many future Sundays as have already
// been planned.
//
// Expected layout: one row per person/role/date assignment —
//   日期 (any recognizable date) / 分組 (optional) / 崗位 / 姓名

import * as XLSX from 'xlsx';
import { RosterScheduleEntry } from '../types/bulletin';
import { normalizeDateValue } from './dateNormalize';

const DEFAULT_SECTION = '主日崇拜事奉芳名表';

const HEADER_ALIASES: Record<'date' | 'section' | 'role' | 'name', string[]> = {
  date: ['日期', '主日', '崇拜日期', 'date', 'sunday'],
  section: ['分組', '表格', '組別', 'section'],
  role: ['崗位', '職事', '職份', 'role'],
  name: ['姓名', '負責人', '事奉人員', '人手', 'name'],
};

type Field = keyof typeof HEADER_ALIASES;

function normalize(cell: unknown): string {
  return String(cell ?? '').trim();
}

function buildColumnIndex(headerRow: unknown[]): Partial<Record<Field, number>> {
  const index: Partial<Record<Field, number>> = {};
  headerRow.forEach((cell, i) => {
    const norm = normalize(cell).toLowerCase();
    (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
      if (HEADER_ALIASES[field].some((alias) => norm.includes(alias.toLowerCase()))) {
        index[field] = i;
      }
    });
  });
  return index;
}

function findScheduleSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | undefined {
  const matched = workbook.SheetNames.find((name) =>
    ['排班', '事奉', 'roster', 'schedule'].some((k) => name.toLowerCase().includes(k.toLowerCase()))
  );
  const name = matched ?? workbook.SheetNames[0];
  return name ? workbook.Sheets[name] : undefined;
}

export async function parseRosterScheduleFile(file: File): Promise<RosterScheduleEntry[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = findScheduleSheet(workbook);
  if (!sheet) return [];

  const [headerRow, ...dataRows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
  });
  if (!headerRow) return [];
  const cols = buildColumnIndex(headerRow);

  let counter = 0;
  return dataRows
    .map((row): RosterScheduleEntry | null => {
      const iso = cols.date !== undefined ? normalizeDateValue(row[cols.date]) : null;
      const role = cols.role !== undefined ? normalize(row[cols.role]) : '';
      const name = cols.name !== undefined ? normalize(row[cols.name]) : '';
      if (!iso || !role || !name) return null;

      counter += 1;
      return {
        id: `rs-${Date.now().toString(36)}-${counter}`,
        date: iso,
        section: (cols.section !== undefined ? normalize(row[cols.section]) : '') || DEFAULT_SECTION,
        role,
        name,
      };
    })
    .filter((entry): entry is RosterScheduleEntry => entry !== null);
}
