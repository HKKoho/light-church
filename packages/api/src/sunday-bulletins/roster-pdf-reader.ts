// packages/api/src/sunday-bulletins/roster-pdf-reader.ts
//
// Turns a duty roster (司職表) grid rebuilt by roster-pdf-layout.ts into
// roster schedule entries for the bulletin tool. The AI only decides which
// roster column feeds which bulletin row (講員 -> 信息, 領詩/司琴 split in
// two, the starred 主餐襄禮 -> 預備主餐 …), following the bulletin's own rows
// as examples. Names are then copied from the grid by code, so a name the
// roster does not print can never appear.
import { BadGatewayException } from '@nestjs/common';
import type { RosterExampleRow, RosterScheduleEntryData } from '@clawix/shared';
import { z } from 'zod';

import { gridToMarkdown, type RosterGrid } from './roster-pdf-layout.js';

const DEFAULT_SECTION = '主日崇拜事奉芳名表';

export const ROSTER_SYSTEM_PROMPT = `You match the columns of a Hong Kong church's printed Sunday duty roster (司職表) to the rows of its weekly bulletin's service roster (事奉芳名表). Reply with the JSON object only.`;

export function buildRosterPrompt(
  grid: RosterGrid,
  examples: readonly RosterExampleRow[],
  examplesDate?: string,
): string {
  const exampleLines = examples
    .map((e) => `- ${e.section}｜${e.role}：${e.example ? e.example.replace(/\n/g, '／') : ''}`)
    .join('\n');
  const when = examplesDate ? `the bulletin for ${examplesDate}` : 'a recent bulletin';
  return `The bulletin's roster rows, as "section｜role：names" from ${when} (several names separated by ／):
${exampleLines}

If the roster below has that date, find each of these names in its row: the column and the position in the cell each came from is the rule to copy (one name can fill several bulletin rows).

The roster:
${gridToMarkdown(grid)}

Return:
{"year": 2026, "columns": [{"column": "roster column name", "targets": [{"section": "", "role": "", "take": "all", "onlyIf": ""}]}]}
- year: the roster's year, from its title.
- For every roster column except the date column, list the bulletin rows it fills, using the bulletin's exact section and role names.
- take picks names from the column's cell: "all", "first", "second", "rest" (all but the first) or "starred" (only names marked *).
  Look at the example names to see how the church splits a column, e.g. a combined 領詩/司琴 column lists the song leader first and the pianist second.
- onlyIf: fill this row only on services whose date cell contains this word (e.g. "主餐" for rows that exist only on Communion Sundays, such as the preacher presiding at 主持主餐); "" otherwise.
- A column with no matching bulletin row: target section "${DEFAULT_SECTION}" with the column name as role.`;
}

const TAKES = ['all', 'first', 'second', 'rest', 'starred'] as const;

const mappingSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  columns: z.array(
    z.object({
      column: z.string(),
      targets: z.array(
        z.object({
          section: z.string().default(''),
          role: z.string(),
          take: z.enum(TAKES).catch('all'),
          onlyIf: z.string().default(''),
        }),
      ),
    }),
  ),
});

type Mapping = z.infer<typeof mappingSchema>;
type Take = (typeof TAKES)[number];
type Target = Mapping['columns'][number]['targets'][number];

export function parseRosterMapping(reply: string): Mapping {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start)
    throw new BadGatewayException('The AI reply had no roster mapping');
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(start, end + 1));
  } catch {
    throw new BadGatewayException('The AI reply was not valid JSON');
  }
  const parsed = mappingSchema.safeParse(raw);
  if (!parsed.success) throw new BadGatewayException('The AI could not match the roster columns');
  return parsed.data;
}

const isBlank = (name: string) => /^[-－—–\s]*$/.test(name);
const cleanName = (name: string) =>
  name
    .replace(/[*＊]/g, '')
    .replace(/[(（](影|音)[)）]/g, '')
    .trim();

function pick(names: readonly string[], take: Take): string[] {
  switch (take) {
    case 'first':
      return names.slice(0, 1);
    case 'second':
      return names.slice(1, 2);
    case 'rest':
      return names.slice(1);
    case 'starred':
      return names.filter((n) => /[*＊]/.test(n));
    default:
      return [...names];
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export interface RosterReading {
  readonly entries: RosterScheduleEntryData[];
  readonly notes: string[];
}

const squash = (s: string) => s.replace(/\s+/g, '');

function columnIndex(grid: RosterGrid, name: string): number {
  return grid.columns.findIndex((c) => squash(c) === squash(name));
}

function rowDate(row: readonly (readonly string[])[], year: number) {
  const dateCell = (row[0] ?? []).join(' ');
  const match = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(dateCell);
  if (!match) return null;
  return {
    dateCell,
    day: match[0],
    label: dateCell.replace(match[0], '').replace(/\s+/g, ' ').trim(),
    date: `${year}-${pad(Number(match[1]))}-${pad(Number(match[2]))}`,
  };
}

const cellNames = (row: readonly (readonly string[])[], index: number) =>
  (row[index] ?? []).filter((n) => !isBlank(n));

// Bulletins and rosters can title the same person differently (姊妹／執事).
const TITLE = /(弟兄|姊妹|執事|傳道|牧師|師母|幹事|博士|先生|女士)$/;
const person = (name: string) => cleanName(name).replace(TITLE, '');

/** Whether `got` names at least everyone in `want` (extra names are fine). */
const covers = (got: readonly string[], want: readonly string[]) => {
  const people = new Set(got.map(person));
  return want.every((n) => people.has(person(n)));
};

/**
 * Checks the AI's mapping against the bulletin's own names for a date the
 * roster also covers. A bulletin row whose mapping misses someone the
 * bulletin lists is moved to the smallest column pick that names them all —
 * e.g. 襄禮 from "rest" to "all", or 主持主餐 from the starred 主餐襄禮 to the
 * 講員 column. Names read from a bulletin can be incomplete, so a mapping that
 * finds extra people is left alone.
 */
export function calibrateMapping(
  grid: RosterGrid,
  mapping: Mapping,
  examples: readonly RosterExampleRow[],
  examplesDate: string | undefined,
): Mapping {
  const row = grid.rows.find((r) => rowDate(r, mapping.year)?.date === examplesDate);
  if (!row) return mapping;
  const expected = new Map(
    examples.map((e) => [
      `${e.section}␟${e.role}`,
      e.example
        .split(/[／/、\n]/)
        .map(cleanName)
        .filter(Boolean),
    ]),
  );
  const columns = mapping.columns.map((c) => ({ ...c, targets: [] as Target[] }));
  const byName = new Map(columns.map((c) => [squash(c.column), c]));
  const choices = columns.flatMap((c) =>
    TAKES.map((take) => ({
      column: c,
      take,
      names: pick(cellNames(row, columnIndex(grid, c.column)), take),
    })),
  );

  mapping.columns.forEach((col, i) => {
    for (const t of col.targets) {
      const want = expected.get(`${t.section.trim() || DEFAULT_SECTION}␟${t.role}`);
      const current = pick(cellNames(row, columnIndex(grid, col.column)), t.take);
      const fit =
        want?.length && !covers(current, want)
          ? choices
              .filter((c) => c.names.length > 0 && covers(c.names, want))
              .sort(
                (a, b) =>
                  a.names.length - b.names.length ||
                  Number(a.column.column !== col.column) - Number(b.column.column !== col.column),
              )[0]
          : undefined;
      if (fit) byName.get(squash(fit.column.column))!.targets.push({ ...t, take: fit.take });
      else columns[i]!.targets.push(t);
    }
  });
  return { ...mapping, columns };
}

/** Applies the AI's column mapping to every service in the grid. */
export function applyRosterMapping(grid: RosterGrid, mapping: Mapping): RosterReading {
  const entries: RosterScheduleEntryData[] = [];
  const notes: string[] = [];
  const seenDates = new Set<string>();

  for (const row of grid.rows) {
    const found = rowDate(row, mapping.year);
    if (!found) continue;
    const { dateCell, day, label, date } = found;
    if (seenDates.has(date)) {
      notes.push(`${day} ${label}：同日另一場聚會，未套用到週刊`);
      continue;
    }
    seenDates.add(date);
    if (label && label !== '崇拜') notes.push(`${day}：${label}`);

    const duties = new Map<string, { section: string; role: string; names: string[] }>();
    for (const col of mapping.columns) {
      const index = columnIndex(grid, col.column);
      if (index <= 0) continue;
      const cell = cellNames(row, index);
      for (const target of col.targets) {
        if (target.onlyIf && !dateCell.includes(target.onlyIf)) continue;
        const names = pick(cell, target.take).map(cleanName).filter(Boolean);
        if (names.length === 0) continue;
        const section = target.section.trim() || DEFAULT_SECTION;
        const key = `${section}␟${target.role}`;
        const duty = duties.get(key) ?? { section, role: target.role, names: [] };
        duty.names.push(...names.filter((n) => !duty.names.includes(n)));
        duties.set(key, duty);
      }
    }
    for (const d of duties.values()) {
      entries.push({ date, section: d.section, role: d.role, name: d.names.join('\n') });
    }
  }

  if (entries.length === 0) throw new BadGatewayException('No duties were found in the roster');
  return { entries, notes };
}
