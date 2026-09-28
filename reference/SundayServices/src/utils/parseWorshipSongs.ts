// Imports worship songs into the hymn-matching library from a spreadsheet
// or a Word (.docx) table (columns 編號 / 標題 / 標籤 / 風格), or a JSON array of
// {number, title, tags, style} — the JSON form doubles as a simple
// interchange format so another system or script can feed songs in without
// a network API.

import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { HymnLibraryEntry } from '../types/bulletin';

const HEADER_ALIASES: Record<'number' | 'title' | 'tags' | 'style', string[]> = {
  number: ['編號', '詩歌編號', 'number', 'no'],
  title: ['標題', '詩歌名稱', '名稱', 'title'],
  tags: ['標籤', '主題', 'tags'],
  style: ['風格', '類型', 'style'],
};

type Field = keyof typeof HEADER_ALIASES;

function normalize(cell: unknown): string {
  return String(cell ?? '').trim();
}

function splitTags(raw: string): string[] {
  return raw
    .split(/[、,，;；/]/)
    .map((t) => t.trim())
    .filter(Boolean);
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

function findSongSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | undefined {
  const matched = workbook.SheetNames.find((name) =>
    ['詩歌', '歌曲', '曲庫', 'song', 'hymn'].some((k) => name.toLowerCase().includes(k.toLowerCase()))
  );
  const name = matched ?? workbook.SheetNames[0];
  return name ? workbook.Sheets[name] : undefined;
}

function normalizeEntry(raw: {
  number?: unknown;
  title?: unknown;
  tags?: unknown;
  style?: unknown;
}): HymnLibraryEntry | null {
  const title = normalize(raw.title);
  if (!title) return null;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
    : splitTags(normalize(raw.tags));
  return {
    number: normalize(raw.number),
    title,
    tags,
    style: normalize(raw.style) || '未分類',
  };
}

function parseWorshipSongsExcel(buffer: ArrayBuffer): HymnLibraryEntry[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = findSongSheet(workbook);
  if (!sheet) return [];

  return rowsToEntries(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false }));
}

function rowsToEntries(rows: unknown[][]): HymnLibraryEntry[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];
  const cols = buildColumnIndex(headerRow);

  return dataRows
    .map((row) =>
      normalizeEntry({
        number: cols.number !== undefined ? row[cols.number] : undefined,
        title: cols.title !== undefined ? row[cols.title] : undefined,
        tags: cols.tags !== undefined ? row[cols.tags] : undefined,
        style: cols.style !== undefined ? row[cols.style] : undefined,
      })
    )
    .filter((e): e is HymnLibraryEntry => e !== null);
}

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function paragraphText(el: Element): string {
  return Array.from(el.getElementsByTagNameNS(W_NS, 't'))
    .map((t) => t.textContent ?? '')
    .join('')
    .trim();
}

// Uses the first table whose header row names a 標題 column; without one,
// each non-empty paragraph is a song, e.g. "123 奇異恩典" or "奇異恩典".
async function parseWorshipSongsDocx(buffer: ArrayBuffer): Promise<HymnLibraryEntry[]> {
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  for (const table of Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'))) {
    const rows = Array.from(table.getElementsByTagNameNS(W_NS, 'tr')).map((tr) =>
      Array.from(tr.getElementsByTagNameNS(W_NS, 'tc')).map(paragraphText)
    );
    if (rows[0] && buildColumnIndex(rows[0]).title !== undefined) return rowsToEntries(rows);
  }

  return Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))
    .map(paragraphText)
    .map((line) => {
      const m = /^(\d+[A-Za-z]?)[\s.、．]+(.+)$/.exec(line);
      return normalizeEntry(m ? { number: m[1], title: m[2] } : { title: line });
    })
    .filter((e): e is HymnLibraryEntry => e !== null);
}

async function parseWorshipSongsJson(file: File): Promise<HymnLibraryEntry[]> {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeEntry(item ?? {})).filter((e): e is HymnLibraryEntry => e !== null);
}

export async function parseWorshipSongsFile(file: File): Promise<HymnLibraryEntry[]> {
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
  if (isJson) return parseWorshipSongsJson(file);
  if (file.name.toLowerCase().endsWith('.docx')) return parseWorshipSongsDocx(await file.arrayBuffer());
  return parseWorshipSongsExcel(await file.arrayBuffer());
}
