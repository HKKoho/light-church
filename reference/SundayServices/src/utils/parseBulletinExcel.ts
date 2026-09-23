// Imports hymn lyrics and the service roster from an .xlsx workbook someone
// else maintains outside the CMS, so an officer isn't retyping them by hand.
// Expected layout (sheet name matching is fuzzy, falls back to sheet order):
//   Sheet 1 "詩歌" — columns 標題 / 資料 / 歌詞
//   Sheet 2 "事奉表" — columns 分組 / 崗位 / 本週 / 下週

import * as XLSX from 'xlsx';
import { TextBlock, RosterRow } from '../types/bulletin';

const HYMN_HEADER_ALIASES: Record<'title' | 'meta' | 'body', string[]> = {
  title: ['標題', '詩歌名稱', '名稱', 'title'],
  meta: ['資料', '詞曲資料', '來源', 'meta'],
  body: ['歌詞', '內容', 'body', 'lyrics'],
};

const ROSTER_HEADER_ALIASES: Record<'section' | 'role' | 'thisWeek' | 'nextWeek', string[]> = {
  section: ['分組', '表格', '組別', 'section'],
  role: ['崗位', '職事', '職份', 'role'],
  thisWeek: ['本週', '本主日', 'thisweek'],
  nextWeek: ['下週', '下主日', 'nextweek'],
};

function normalize(cell: unknown): string {
  return String(cell ?? '').trim();
}

function findSheet(workbook: XLSX.WorkBook, keywords: string[], fallbackIndex: number): XLSX.WorkSheet | undefined {
  const matchedName = workbook.SheetNames.find((name) =>
    keywords.some((k) => name.toLowerCase().includes(k.toLowerCase()))
  );
  const name = matchedName ?? workbook.SheetNames[fallbackIndex];
  return name ? workbook.Sheets[name] : undefined;
}

function buildColumnIndex<K extends string>(headerRow: unknown[], aliases: Record<K, string[]>): Partial<Record<K, number>> {
  const index: Partial<Record<K, number>> = {};
  headerRow.forEach((cell, i) => {
    const norm = normalize(cell).toLowerCase();
    (Object.keys(aliases) as K[]).forEach((field) => {
      if (aliases[field].some((alias) => norm.includes(alias.toLowerCase()))) {
        index[field] = i;
      }
    });
  });
  return index;
}

function sheetRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
}

export function parseHymnsSheet(sheet: XLSX.WorkSheet): TextBlock[] {
  const [headerRow, ...dataRows] = sheetRows(sheet);
  if (!headerRow) return [];
  const cols = buildColumnIndex(headerRow, HYMN_HEADER_ALIASES);

  return dataRows
    .map((row, i): TextBlock => ({
      id: `hl-${Date.now()}-${i}`,
      title: cols.title !== undefined ? normalize(row[cols.title]) : '',
      meta: cols.meta !== undefined ? normalize(row[cols.meta]) || undefined : undefined,
      body: cols.body !== undefined ? normalize(row[cols.body]) : '',
    }))
    .filter((block) => block.title || block.body);
}

export function parseRosterSheet(sheet: XLSX.WorkSheet): RosterRow[] {
  const [headerRow, ...dataRows] = sheetRows(sheet);
  if (!headerRow) return [];
  const cols = buildColumnIndex(headerRow, ROSTER_HEADER_ALIASES);

  return dataRows
    .map((row, i): RosterRow => ({
      id: `r-${Date.now()}-${i}`,
      section: cols.section !== undefined ? normalize(row[cols.section]) : '',
      role: cols.role !== undefined ? normalize(row[cols.role]) : '',
      thisWeek: (cols.thisWeek !== undefined ? normalize(row[cols.thisWeek]) : '') || '--',
      nextWeek: (cols.nextWeek !== undefined ? normalize(row[cols.nextWeek]) : '') || '--',
    }))
    .filter((row) => row.role);
}

export interface ParsedBulletinExcel {
  hymnLyrics: TextBlock[];
  serviceRoster: RosterRow[];
}

export async function parseBulletinExcelFile(file: File): Promise<ParsedBulletinExcel> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const hymnSheet = findSheet(workbook, ['詩歌', 'hymn'], 0);
  const rosterSheet = findSheet(workbook, ['事奉', '崗位', 'roster'], 1);

  return {
    hymnLyrics: hymnSheet ? parseHymnsSheet(hymnSheet) : [],
    serviceRoster: rosterSheet ? parseRosterSheet(rosterSheet) : [],
  };
}
