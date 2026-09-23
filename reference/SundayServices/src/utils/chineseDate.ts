// Converts between the Chinese-numeral dates used throughout the bulletin
// ("二零二六年八月九日") and JS Date objects, so a new bulletin's date/title
// can be derived by advancing the last bulletin's date by one week.

const YEAR_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const YEAR_DIGIT_VALUE: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

// Day-of-month also allows the traditional 廿/卅 tens contractions (廿六 = 26,
// 卅 = 30), which is how dates in the twenties/thirties are conventionally
// written in these bulletins (e.g. "七月廿六日").
const DATE_PATTERN = /([零〇一二三四五六七八九]{2,4})年([一二三四五六七八九十]{1,3})月([一二三四五六七八九十廿卅]{1,3})日/;

function chineseNumberToInt(s: string): number {
  if (s === '十') return 10;
  if (s.startsWith('廿') || s.startsWith('卅')) {
    const tens = s[0] === '廿' ? 20 : 30;
    const onesPart = s.slice(1);
    const ones = onesPart === '' ? 0 : (YEAR_DIGIT_VALUE[onesPart] ?? 0);
    return tens + ones;
  }
  if (s.includes('十')) {
    const [tensPart, onesPart] = s.split('十');
    const tens = tensPart === '' ? 1 : YEAR_DIGIT_VALUE[tensPart];
    const ones = onesPart === '' ? 0 : YEAR_DIGIT_VALUE[onesPart];
    return tens * 10 + ones;
  }
  return YEAR_DIGIT_VALUE[s] ?? 0;
}

function intToChineseNumber(n: number): string {
  if (n <= 10) return n === 10 ? '十' : YEAR_DIGITS[n];
  if (n < 20) return '十' + (n % 10 === 0 ? '' : YEAR_DIGITS[n % 10]);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return YEAR_DIGITS[tens] + '十' + (ones === 0 ? '' : YEAR_DIGITS[ones]);
}

function chineseYearToInt(s: string): number {
  return s.split('').reduce((acc, ch) => acc * 10 + (YEAR_DIGIT_VALUE[ch] ?? 0), 0);
}

function intToChineseYear(y: number): string {
  return String(y).split('').map((d) => YEAR_DIGITS[parseInt(d, 10)]).join('');
}

/** Extracts the first Chinese-numeral "YYYY年M月D日" date found in `s` as a JS Date (local midnight), or null. */
export function parseChineseDate(s: string): Date | null {
  const match = s.match(DATE_PATTERN);
  if (!match) return null;
  const year = chineseYearToInt(match[1]);
  const month = chineseNumberToInt(match[2]);
  const day = chineseNumberToInt(match[3]);
  return new Date(year, month - 1, day);
}

/** Replaces the first Chinese-numeral date found in `s` with `date`, preserving any prefix/suffix text. */
export function replaceChineseDate(s: string, date: Date): string {
  return s.replace(
    DATE_PATTERN,
    `${intToChineseYear(date.getFullYear())}年${intToChineseNumber(date.getMonth() + 1)}月${intToChineseNumber(date.getDate())}日`
  );
}

/** Advances the Chinese-numeral date found in `s` by `days`, preserving any prefix/suffix text. Returns `s` unchanged if no date is found. */
export function advanceChineseDate(s: string, days: number): string {
  const parsed = parseChineseDate(s);
  if (!parsed) return s;
  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return replaceChineseDate(s, next);
}
