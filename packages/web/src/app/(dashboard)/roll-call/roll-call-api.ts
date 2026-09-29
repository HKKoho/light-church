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
  phoneLast4?: string;
  department?: string;
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

/** A whole phone number (8+ digits, spaces and + allowed) → its last four digits. */
const phoneTail = (cell: string) => {
  const digits = cell.replace(/[\s()+-]/g, '');
  return /^\d{8,15}$/.test(digits) ? digits.slice(-4) : null;
};

/**
 * "陳大文, 男, 1985, 91234567, 詩班" / "Mary Lee, F, 34" — sex, birth year (or
 * age), a full phone number and a department are optional, in any order.
 */
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
    const phone = phoneTail(cell);
    if (sex) person.sex = sex;
    else if (phone) person.phoneLast4 = phone;
    else if (/^\d{4}$/.test(cell) && Number(cell) >= 1900 && Number(cell) <= year)
      person.birthYear = Number(cell);
    else if (/^\d{1,3}$/.test(cell) && Number(cell) <= 120) person.birthYear = year - Number(cell);
    else if (cell && !/^\d+$/.test(cell)) person.department = raw.trim().slice(0, 50);
  }
  return person;
}

const HEADER = /^(name|姓名|名字)$/i;
type Column = 'name' | 'sex' | 'birthYear' | 'age' | 'phone' | 'department';
const COLUMNS: readonly [Column, RegExp][] = [
  ['name', HEADER],
  ['sex', /^(sex|gender|性別)$/i],
  ['birthYear', /^(birth ?year|born|出生年份?)$/i],
  ['age', /^(age|年齡)$/i],
  ['phone', /(phone|mobile|tel|last ?4|電話|手機|末\s*[4四])/i],
  ['department', /^(department|dept|ministry|部門|事工|小組|團契)$/i],
];

/** A row read through named columns — the only way to give a bare "1234" as a phone. */
function personFromColumns(
  cells: readonly string[],
  columns: readonly (Column | null)[],
  year: number,
): PersonInput | null {
  const get = (c: Column) => cells[columns.indexOf(c)]?.trim() ?? '';
  const name = get('name');
  if (!name) return null;
  const person: PersonInput = { name };
  const sex = SEX_WORDS[get('sex').toLowerCase()];
  if (sex) person.sex = sex;
  const born = Number(get('birthYear'));
  const age = Number(get('age'));
  if (Number.isInteger(born) && born >= 1900 && born <= year) person.birthYear = born;
  else if (get('age') && Number.isInteger(age) && age <= 120) person.birthYear = year - age;
  const digits = get('phone').replace(/\D/g, '');
  if (digits.length >= 4) person.phoneLast4 = digits.slice(-4);
  const department = get('department');
  if (department) person.department = department.slice(0, 50);
  return person;
}

/** People from typed lines or a CSV (a header row, if any, names the columns). */
export function parsePeople(text: string, year = new Date().getFullYear()): PersonInput[] {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  if (!HEADER.test(header[0]?.trim() ?? '')) {
    return rows.map((r) => parsePerson(r, year)).filter((p): p is PersonInput => p !== null);
  }
  const columns = header.map((h) => COLUMNS.find(([, re]) => re.test(h.trim()))?.[0] ?? null);
  return rows
    .slice(1)
    .map((r) => personFromColumns(r, columns, year))
    .filter((p): p is PersonInput => p !== null);
}

export const ageOf = (birthYear: number | null, year = new Date().getFullYear()) =>
  birthYear === null ? null : year - birthYear;

const SPOKEN_DIGITS: Record<string, string> = {
  零: '0',
  〇: '0',
  洞: '0',
  一: '1',
  幺: '1',
  二: '2',
  兩: '2',
  两: '2',
  三: '3',
  四: '4',
  五: '5',
  六: '6',
  七: '7',
  八: '8',
  九: '9',
  zero: '0',
  oh: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

/** The digits in a spoken transcript ("九一二三", "nine one 2 3") — the last four, if at least four. */
export function digitsFrom(transcript: string): string | null {
  let digits = '';
  for (const token of transcript.toLowerCase().match(/[a-z]+|./gu) ?? []) {
    if (/^\d$/.test(token)) digits += token;
    else digits += SPOKEN_DIGITS[token] ?? '';
  }
  return digits.length >= 4 ? digits.slice(-4) : null;
}
