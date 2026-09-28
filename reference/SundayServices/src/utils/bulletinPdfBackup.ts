// Builds a self-contained PDF backup of a bulletin with no PDF library:
// each page is a canvas-rendered JPEG (so Chinese text needs no embedded
// font), and the exact ChurchService JSON rides along as a PDF file
// attachment, which readPdfBackupJson() pulls back out on upload.

import { ChurchService } from '../types/bulletin';

const PAGE_W = 1240; // A4 at 150 dpi
const PAGE_H = 1754;
const MARGIN = 100;
const ATTACHMENT_NAME = 'bulletin-backup.json';

interface Line {
  text: string;
  size: number;
  bold?: boolean;
  gapBefore?: number;
}

function summaryLines(service: ChurchService): Line[] {
  const lines: Line[] = [];
  if (service.churchName) lines.push({ text: service.churchName, size: 30 });
  lines.push({ text: service.title, size: 44, bold: true, gapBefore: 8 });
  lines.push({ text: service.date, size: 28 });
  const sermon = [service.sermonTitle, service.scripture, service.preacher].filter(Boolean).join('　');
  if (sermon) lines.push({ text: `講道：${sermon}`, size: 28, gapBefore: 16 });

  if (service.items.length > 0) {
    lines.push({ text: '崇拜程序', size: 32, bold: true, gapBefore: 36 });
    for (const item of service.items) {
      const detail = [item.detail, item.leader && `（${item.leader}）`].filter(Boolean).join(' ');
      lines.push({ text: detail ? `${item.label} — ${detail}` : item.label, size: 26, gapBefore: 6 });
    }
  }
  if (service.announcements.length > 0) {
    lines.push({ text: '報告事項', size: 32, bold: true, gapBefore: 36 });
    service.announcements.forEach((a, i) => lines.push({ text: `${i + 1}. ${a.text}`, size: 26, gapBefore: 6 }));
  }
  return lines;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let current = '';
    for (const ch of para) {
      if (current && ctx.measureText(current + ch).width > maxWidth) {
        out.push(current);
        current = '';
      }
      current += ch;
    }
    out.push(current);
  }
  return out;
}

function newPage(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('瀏覽器不支援產生 PDF。');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

function renderPages(service: ChurchService): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  let { canvas, ctx } = newPage();
  pages.push(canvas);
  let y = MARGIN;
  const bottom = PAGE_H - MARGIN - 40;

  for (const line of summaryLines(service)) {
    ctx.font = `${line.bold ? 'bold ' : ''}${line.size}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
    y += line.gapBefore ?? 0;
    for (const row of wrap(ctx, line.text, PAGE_W - MARGIN * 2)) {
      const h = line.size * 1.45;
      if (y + h > bottom) {
        const font = ctx.font;
        ({ canvas, ctx } = newPage());
        ctx.font = font;
        pages.push(canvas);
        y = MARGIN;
      }
      ctx.fillText(row, MARGIN, y);
      y += h;
    }
  }

  pages.forEach((page, i) => {
    const c = page.getContext('2d')!;
    c.font = '20px sans-serif';
    c.fillStyle = '#6b7280';
    c.fillText(`週報備份 — 以「上載週報備份（PDF）」匯入即可還原　${i + 1}／${pages.length}`, MARGIN, PAGE_H - MARGIN);
  });
  return pages;
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('無法產生 PDF 頁面。');
  return new Uint8Array(await blob.arrayBuffer());
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export async function buildBulletinPdf(service: ChurchService): Promise<Blob> {
  const jpegs = await Promise.all(renderPages(service).map(canvasToJpeg));
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (id: number, body: string | Uint8Array[]) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    if (typeof body === 'string') push(body);
    else body.forEach(push);
    push('\nendobj\n');
  };

  // Objects: 1 catalog, 2 pages, 3 filespec, 4 attachment, then 3 per page.
  const pageIds = jpegs.map((_, i) => 5 + i * 3);
  const json = enc.encode(JSON.stringify(service, null, 2));
  const hex = `${toHex(json)}>`;

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, `<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(${ATTACHMENT_NAME}) 3 0 R] >> >> >>`);
  obj(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  obj(3, `<< /Type /Filespec /F (${ATTACHMENT_NAME}) /UF (${ATTACHMENT_NAME}) /EF << /F 4 0 R >> >>`);
  obj(4, `<< /Type /EmbeddedFile /Subtype /application#2Fjson /Filter /ASCIIHexDecode /Length ${hex.length} >>\nstream\n${hex}\nendstream`);
  jpegs.forEach((jpeg, i) => {
    const pageId = pageIds[i]!;
    const draw = `q 595 0 0 842 0 0 cm /Im0 Do Q`;
    obj(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`);
    obj(pageId + 1, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(pageId + 2, [
      enc.encode(`<< /Type /XObject /Subtype /Image /Width ${PAGE_W} /Height ${PAGE_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      enc.encode('\nendstream'),
    ]);
  });

  const count = offsets.length;
  const xrefAt = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(`${xref}trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

/** Returns the bulletin JSON embedded by buildBulletinPdf, or null if absent. */
export async function readPdfBackupJson(file: File): Promise<string | null> {
  const raw = new TextDecoder('latin1').decode(await file.arrayBuffer());
  const match = /\/Type \/EmbeddedFile[^]*?stream\r?\n([0-9a-fA-F\s]*)>/.exec(raw);
  if (!match) return null;
  const hex = match[1]!.replace(/\s+/g, '');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder().decode(bytes);
}
