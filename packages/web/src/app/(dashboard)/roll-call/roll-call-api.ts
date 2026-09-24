export const ROLL_CALL_API = '/api/v1/roll-call';
export const groupApi = (groupId: string) => `${ROLL_CALL_API}/groups/${groupId}`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(
  fileName: string,
  rows: readonly (readonly (string | number)[])[],
): void {
  // BOM so Excel opens Chinese names correctly.
  const text = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

/** Splits CSV text into rows (handles quoted cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i);
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * A Quick Roll Call export: header 姓名,出席狀態,時間 then one row per person.
 * Returns everyone's name, who was present (出席 / present), and the roll-call
 * date taken from the first tick's timestamp, when there is one.
 */
export function parseQuickRollCallCsv(text: string): {
  names: string[];
  present: string[];
  date: string | null;
} {
  const rows = parseCsv(text);
  const header = rows[0]?.map((c) => c.trim()) ?? [];
  const hasHeader = header[0] === '姓名' || /^name$/i.test(header[0] ?? '');
  const body = hasHeader ? rows.slice(1) : rows;
  const names: string[] = [];
  const present: string[] = [];
  let date: string | null = null;
  for (const r of body) {
    const name = r[0]?.trim();
    if (!name) continue;
    names.push(name);
    const status = r[1]?.trim().toLowerCase() ?? '';
    if (status === '出席' || status === 'present' || status === '已到') present.push(name);
    const stamp = /^(\d{4}-\d{2}-\d{2})T/.exec(r[2]?.trim() ?? '');
    if (stamp?.[1] && (!date || stamp[1] < date)) date = stamp[1];
  }
  return { names, present, date };
}

/** Same normalisation as the server: case, spacing, punctuation, English word order. */
export function nameKey(name: string): string {
  const words = name
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .split(/[\s,.\-_/()'’·]+/)
    .filter(Boolean);
  return (words.every((w) => /^[a-z0-9]+$/.test(w)) ? [...words].sort() : words).join('');
}

export interface PersonInput {
  name: string;
  sex?: 'male' | 'female' | '';
  birthYear?: number | null;
}

const SEX_WORDS: Record<string, 'male' | 'female'> = {
  m: 'male',
  male: 'male',
  man: 'male',
  男: 'male',
  f: 'female',
  female: 'female',
  woman: 'female',
  女: 'female',
};

/** "陳大文, 男, 1985" / "Mary Lee, F, 34" — sex and birth year (or age) are optional. */
export function parsePerson(
  cells: readonly string[],
  year = new Date().getFullYear(),
): PersonInput | null {
  const name = cells[0]?.trim() ?? '';
  if (!name) return null;
  const person: PersonInput = { name };
  for (const raw of cells.slice(1)) {
    const cell = raw.trim().toLowerCase();
    const sex = SEX_WORDS[cell];
    if (sex) person.sex = sex;
    else if (/^\d{4}$/.test(cell) && Number(cell) >= 1900 && Number(cell) <= year)
      person.birthYear = Number(cell);
    else if (/^\d{1,3}$/.test(cell) && Number(cell) <= 120) person.birthYear = year - Number(cell);
  }
  return person;
}

const HEADER = /^(name|姓名|名字)$/i;

/** People from typed lines or a CSV (an optional header row is skipped). */
export function parsePeople(text: string): PersonInput[] {
  const rows = parseCsv(text);
  const body = HEADER.test(rows[0]?.[0]?.trim() ?? '') ? rows.slice(1) : rows;
  return body.map((r) => parsePerson(r)).filter((p): p is PersonInput => p !== null);
}

export const ageOf = (birthYear: number | null, year = new Date().getFullYear()) =>
  birthYear === null ? null : year - birthYear;
