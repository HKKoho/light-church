// packages/api/src/sunday-bulletins/roster-pdf-layout.ts
//
// Rebuilds the grid of a printed duty roster (司職表) PDF from text
// positions, so the AI gets a clean table instead of a text layer where names
// shift column whenever a cell is empty. The header row (the top-most line
// with many cells) fixes the columns; a line with a date in the first column
// starts a new row, and the lines below it belong to that row.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

import { UnprocessableEntityException } from '@nestjs/common';

interface TextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PdfjsTextItem {
  readonly str?: string;
  readonly transform?: readonly number[];
  readonly width?: number;
}

interface Pdfjs {
  getDocument(src: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getTextContent(): Promise<{ items: readonly PdfjsTextItem[] }>;
      }>;
      destroy(): Promise<void>;
    }>;
  };
}

const MAX_PAGES = 5;
const SAME_LINE_PT = 2;
const HEADER_MIN_CELLS = 4;
const HEADER_WIDE_SHARE = 0.8;
/** Header words split into pieces ("日", "期") closer than this are one cell. */
const HEADER_JOIN_GAP_PT = 6;

// pdf-parse already bundles pdfjs; load that same copy (resolved from
// pdf-parse's own folder) rather than depending on a second version.
let pdfjsPromise: Promise<Pdfjs> | null = null;
function loadPdfjs(): Promise<Pdfjs> {
  if (!pdfjsPromise) {
    const require = createRequire(import.meta.url);
    const fromPdfParse = createRequire(require.resolve('pdf-parse'));
    const path = fromPdfParse.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsPromise = import(pathToFileURL(path).href) as Promise<Pdfjs>;
  }
  return pdfjsPromise;
}

async function readItems(content: Uint8Array): Promise<TextItem[][]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(content) }).promise;
  try {
    const pages: TextItem[][] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const { items } = await (await doc.getPage(n)).getTextContent();
      pages.push(
        items
          .filter((i) => i.str?.trim() && i.transform)
          .map((i) => ({
            text: i.str!.trim(),
            x: i.transform![4]!,
            y: i.transform![5]!,
            width: i.width ?? 0,
            height: Math.abs(i.transform![3]!),
          })),
      );
    }
    return pages;
  } finally {
    await doc.destroy();
  }
}

/** Groups items into lines, top of the page first, each line left to right. */
export function toLines(items: readonly TextItem[]): TextItem[][] {
  const lines: TextItem[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l[0]!.y - item.y) <= SAME_LINE_PT);
    if (line) line.push(item);
    else lines.push([item]);
  }
  return lines.map((l) => l.sort((a, b) => a.x - b.x));
}

function joinHeader(line: readonly TextItem[]): TextItem[] {
  const cells: TextItem[] = [];
  for (const item of line) {
    const prev = cells[cells.length - 1];
    if (prev && item.x - (prev.x + prev.width) < HEADER_JOIN_GAP_PT) {
      cells[cells.length - 1] = {
        ...prev,
        text: prev.text + item.text,
        width: item.x + item.width - prev.x,
      };
    } else {
      cells.push(item);
    }
  }
  return cells.map((c) => ({ ...c, text: c.text.replace(/\s+/g, '') }));
}

const centre = (i: TextItem) => i.x + i.width / 2;

/** A duty roster's grid: one row per service, each cell a list of names. */
export interface RosterGrid {
  /** Text above the grid (church name, title with the year). */
  readonly title: string;
  readonly columns: readonly string[];
  /** cells[0] is the date column, e.g. ["10月4日", "主餐", "崇拜"]. */
  readonly rows: readonly (readonly (readonly string[])[])[];
  /** Footnotes below the grid, e.g. "*預備主餐". */
  readonly notes: readonly string[];
}

/** Rebuilds the grid of one page, or null when the page has no grid. */
export function gridFromPage(items: readonly TextItem[]): RosterGrid | null {
  const lines = toLines(items);
  // The header is the top-most line about as wide as the widest line — a
  // letter-spaced title has many pieces too, but fewer than the grid.
  const widths = lines.map((l) => joinHeader(l).length);
  const widest = Math.max(0, ...widths);
  const headerIndex =
    widest < HEADER_MIN_CELLS ? -1 : widths.findIndex((w) => w >= widest * HEADER_WIDE_SHARE);
  if (headerIndex < 0) return null;

  const header = joinHeader(lines[headerIndex]!);
  const column = (item: TextItem): number => {
    let best = 0;
    header.forEach((h, i) => {
      if (Math.abs(centre(h) - centre(item)) < Math.abs(centre(header[best]!) - centre(item))) {
        best = i;
      }
    });
    return best;
  };

  // Footnotes are set smaller than the grid text.
  const gridHeight = lines[headerIndex]![0]!.height;
  const rows: string[][][] = [];
  const notes: string[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.every((i) => i.height < gridHeight * 0.8)) {
      notes.push(line.map((i) => i.text).join(' '));
      continue;
    }
    const startsRow = line.some((i) => column(i) === 0 && /\d/.test(i.text));
    if (startsRow || rows.length === 0) rows.push(header.map(() => []));
    const row = rows[rows.length - 1]!;
    for (const item of line) row[column(item)]!.push(item.text);
  }

  return {
    title: lines
      .slice(0, headerIndex)
      .map((l) => l.map((i) => i.text).join(' '))
      .join('\n'),
    columns: header.map((h) => h.text),
    rows,
    notes,
  };
}

/** The grid as a Markdown table, for the AI to read. */
export function gridToMarkdown(grid: RosterGrid): string {
  return [
    grid.title,
    '',
    `| ${grid.columns.join(' | ')} |`,
    ...grid.rows.map((r) => `| ${r.map((c, i) => c.join(i === 0 ? ' ' : '、')).join(' | ')} |`),
    '',
    ...grid.notes,
  ]
    .join('\n')
    .trim();
}

/** The duty roster grid on the PDF's first page that has one. */
export async function extractRosterGrid(content: Uint8Array): Promise<RosterGrid> {
  for (const items of await readItems(content)) {
    const grid = gridFromPage(items);
    if (grid && grid.rows.length > 0) return grid;
  }
  throw new UnprocessableEntityException(
    'No roster table was found in the PDF (is it a scan, or not a 司職表?)',
  );
}
