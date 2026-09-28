// packages/api/src/sunday-bulletins/bulletin-pdf-reader.ts
//
// Turns an uploaded past-bulletin PDF into the Sunday Service Bulletin tool's
// bulletin JSON: pdf-parse pulls the text layer, the church's AI provider
// (via OneShotLlmService) structures it, and this file validates the reply
// and formats the Chinese-numeral date the tool keys every bulletin on.
import { BadGatewayException, UnprocessableEntityException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';

/** Text sent to the model is capped — a bulletin is ~6k characters. */
const MAX_PDF_TEXT_CHARS = 40_000;
const MAX_PDF_PAGES = 40;

export async function extractPdfText(content: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: content });
  try {
    const result = await parser.getText({ first: MAX_PDF_PAGES });
    const text = result.text.trim();
    if (text.length < 50) {
      throw new UnprocessableEntityException('The PDF has no readable text (is it a scan?)');
    }
    return text.slice(0, MAX_PDF_TEXT_CHARS);
  } finally {
    await parser.destroy();
  }
}

export const BULLETIN_SYSTEM_PROMPT = `You read a Hong Kong church's printed Sunday service bulletin (text extracted from its PDF) and return it as JSON for the church's bulletin editor.
Copy names, titles, scripture references and wording exactly as printed, in Traditional Chinese. Remove the letter-spacing the PDF adds between characters (e.g. "安 靜" -> "安靜", "陳 潤 生 傳 道" -> "陳潤生傳道") and drop dash leaders.
Never invent content; use "" or [] for anything not in the bulletin. Reply with the JSON object only.`;

export function buildBulletinPrompt(pdfText: string): string {
  return `Return exactly this JSON shape:
{
  "serviceDate": "YYYY-MM-DD",
  "serviceName": "主日崇拜",
  "time": "上午 9 時 45 分",
  "churchName": "", "motto": "",
  "sermonSeries": "", "sermonTitle": "", "scripture": "", "preacher": "",
  "items": [{"type": "prelude|call|hymn|prayer|sermon|offertory|doxology|benediction|custom", "label": "宣召", "detail": "彼得前書 4:7-10 — 劉家安弟兄", "leader": ""}],
  "hymns": [{"title": "", "meta": "曲／詞／版權 credit line"}],
  "callToWorship": {"meta": "scripture reference", "body": "the full 啟／應／齊 responsive reading, one line each"},
  "ministryUpdates": [{"title": "1. 標題", "body": ""}],
  "otherNotices": [{"title": "1. 標題", "body": ""}],
  "weeklyPrayers": [{"title": "1.", "body": ""}],
  "serviceRoster": [{"section": "主日崇拜事奉芳名表", "role": "主席", "thisWeek": "", "nextWeek": ""}],
  "attendance": [{"meeting": "主日崇拜", "count": "107 人"}],
  "attendanceNote": ""
}
Rules:
- items: every line of the order of service, in order. For 讚美, list the song titles in detail joined by "、" then " — " and the leader. For 信息, detail is the sermon title and leader the preacher.
- hymns: every song whose lyrics are printed, title and credit line only (no lyrics).
- ministryUpdates = 家事分享 items; otherNotices = 其他報告; weeklyPrayers = 本週代禱. Keep each body's line breaks.
- serviceRoster: every row of every 事奉芳名表 (本週 -> thisWeek, 下週 -> nextWeek), with its table heading as section.
- attendance: the 上週聚會出席人數 table.

Bulletin text:
"""
${pdfText}
"""`;
}

const textBlock = z.object({
  title: z.string().default(''),
  meta: z.string().optional(),
  body: z.string().default(''),
});

const ITEM_TYPES = [
  'prelude',
  'call',
  'hymn',
  'prayer',
  'sermon',
  'offertory',
  'doxology',
  'benediction',
  'custom',
] as const;

const replySchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceName: z.string().default('主日崇拜'),
  time: z.string().default(''),
  churchName: z.string().default(''),
  motto: z.string().default(''),
  sermonSeries: z.string().default(''),
  sermonTitle: z.string().default(''),
  scripture: z.string().default(''),
  preacher: z.string().default(''),
  items: z
    .array(
      z.object({
        type: z.enum(ITEM_TYPES).catch('custom'),
        label: z.string(),
        detail: z.string().default(''),
        leader: z.string().optional(),
      }),
    )
    .default([]),
  hymns: z.array(z.object({ title: z.string(), meta: z.string().optional() })).default([]),
  callToWorship: z.object({ meta: z.string().default(''), body: z.string() }).nullish(),
  ministryUpdates: z.array(textBlock).default([]),
  otherNotices: z.array(textBlock).default([]),
  weeklyPrayers: z.array(textBlock).default([]),
  serviceRoster: z
    .array(
      z.object({
        section: z.string().default(''),
        role: z.string(),
        thisWeek: z.string().default(''),
        nextWeek: z.string().default(''),
      }),
    )
    .default([]),
  attendance: z.array(z.object({ meeting: z.string(), count: z.string() })).default([]),
  attendanceNote: z.string().optional(),
});

/** Full-width space the bulletins put between title/date parts. */
const IDEOGRAPHIC_SPACE = '\u3000';

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

function chineseNumber(n: number): string {
  if (n < 10) return DIGITS[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens === 1 ? '' : DIGITS[tens]!) + '十' + (ones === 0 ? '' : DIGITS[ones]!);
}

/** "2026-09-27" -> "二零二六年九月二十七日", the format the tool parses dates from. */
export function chineseDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const year = String(y)
    .split('')
    .map((c) => DIGITS[Number(c)]!)
    .join('');
  return `${year}年${chineseNumber(m)}月${chineseNumber(d)}日`;
}

/** Validates the model's reply and builds the tool's bulletin JSON (fresh ids, status finalized). */
export function parseBulletinReply(
  reply: string,
  id: string,
): Record<string, unknown> & {
  id: string;
  title: string;
  date: string;
} {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end <= start) throw new BadGatewayException('The AI reply had no bulletin');
  let raw: unknown;
  try {
    raw = JSON.parse(reply.slice(start, end + 1));
  } catch {
    throw new BadGatewayException('The AI reply was not valid JSON');
  }
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) throw new BadGatewayException('The AI could not find the service date');
  const r = parsed.data;

  const cnDate = chineseDate(r.serviceDate);
  const withIds = <T extends object>(list: readonly T[], prefix: string) =>
    list.map((entry, i) => ({ id: `${prefix}${i + 1}`, ...entry }));
  const worshipNotes = r.callToWorship?.body
    ? [{ title: '宣召啟應文', meta: r.callToWorship.meta, body: r.callToWorship.body }]
    : [];

  return {
    id,
    title: `${r.serviceName || '主日崇拜'}${IDEOGRAPHIC_SPACE}${cnDate}`,
    date: r.time ? `${cnDate}${IDEOGRAPHIC_SPACE}${r.time}` : cnDate,
    churchName: r.churchName,
    motto: r.motto,
    sermonSeries: r.sermonSeries,
    sermonTitle: r.sermonTitle,
    scripture: r.scripture,
    preacher: r.preacher,
    status: 'finalized',
    items: withIds(r.items, 'i'),
    // Announcements mirror the 家事分享 headings, as in the tool's own sample.
    announcements: r.ministryUpdates.map((u, i) => ({
      id: `a${i + 1}`,
      text: [u.title.replace(/^\d+\.\s*/, ''), u.body.split('\n')[0]].filter(Boolean).join('：'),
    })),
    hymnLyrics: withIds(
      r.hymns.map((h) => ({ title: h.title, meta: h.meta ?? '', body: '' })),
      'hl',
    ),
    worshipNotes: withIds(worshipNotes, 'wn'),
    ministryUpdates: withIds(r.ministryUpdates, 'mu'),
    otherNotices: withIds(r.otherNotices, 'on'),
    weeklyPrayers: withIds(r.weeklyPrayers, 'wp'),
    serviceRoster: withIds(r.serviceRoster, 'r'),
    attendance: withIds(r.attendance, 'at'),
    ...(r.attendanceNote ? { attendanceNote: r.attendanceNote } : {}),
  };
}
