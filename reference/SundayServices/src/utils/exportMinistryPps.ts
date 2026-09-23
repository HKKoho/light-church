// Turns "家事分享" (ministryUpdates) into a downloadable .pptx deck — one
// slide per item plus a title slide — so officers can project it during
// announcements instead of retyping it into PowerPoint by hand.
//
// The deck is also set to play like a self-running slideshow: each slide
// auto-advances after SECONDS_PER_SLIDE with no click needed, and the show
// loops continuously, so pressing "Slide Show > From Beginning" once lets it
// run like a looping announcement video on a lobby screen.

import type PptxGenJS from 'pptxgenjs';
import { ChurchService, TextBlock } from '../types/bulletin';
import { richTextToPlainText } from './sanitizeRichText';
import { richTextToPptxRuns } from './richTextToPptxRuns';

const FONT = 'Microsoft JhengHei';
const INK = '1E293B'; // slate-800
const MUTED = '64748B'; // slate-500
const ACCENT = '2563EB'; // blue-600

const SLIDE_W = 10;
const SLIDE_H = 5.63; // 16:9

const SECONDS_PER_SLIDE = 10;

function bodyFontSize(body: string): number {
  const len = body.length;
  if (len > 500) return 12;
  if (len > 320) return 14;
  if (len > 180) return 16;
  if (len > 80) return 18;
  return 22;
}

function addTitleSlide(pptx: PptxGenJS, service: ChurchService): void {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  slide.addText(service.churchName, {
    x: 0.5, y: 1.5, w: SLIDE_W - 1, h: 0.9,
    align: 'center', fontFace: FONT, fontSize: 32, bold: true, color: INK,
  });
  slide.addText(`「${service.motto}」`, {
    x: 0.5, y: 2.35, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontFace: FONT, fontSize: 16, italic: true, color: MUTED,
  });
  slide.addText('家事分享', {
    x: 0.5, y: 3.05, w: SLIDE_W - 1, h: 0.8,
    align: 'center', fontFace: FONT, fontSize: 28, bold: true, color: ACCENT,
  });
  slide.addText(service.date, {
    x: 0.5, y: 3.9, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontFace: FONT, fontSize: 14, color: MUTED,
  });
}

function addItemSlide(pptx: PptxGenJS, item: TextBlock): void {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };

  slide.addText(item.title, {
    x: 0.5, y: 0.4, w: SLIDE_W - 1, h: 0.7,
    align: 'left', fontFace: FONT, fontSize: 24, bold: true, color: ACCENT,
  });

  const bodyTop = item.meta ? 1.5 : 1.15;
  if (item.meta) {
    slide.addText(item.meta, {
      x: 0.5, y: 1.05, w: SLIDE_W - 1, h: 0.4,
      align: 'left', fontFace: FONT, fontSize: 12, italic: true, color: MUTED,
    });
  }

  slide.addText(richTextToPptxRuns(item.body), {
    x: 0.5, y: bodyTop, w: SLIDE_W - 1, h: SLIDE_H - bodyTop - 0.4,
    align: 'left', valign: 'top', fontFace: FONT,
    fontSize: bodyFontSize(richTextToPlainText(item.body)), color: INK,
    lineSpacingMultiple: 1.3, fit: 'shrink',
  });
}

// pptxgenjs has no API for slide timing/looping, so this patches the raw
// OOXML parts after the fact. Verified against pptxgenjs 4.0.1's actual
// output (not just the spec) before wiring this in:
//   - ppt/slides/slideN.xml ends "...</p:clrMapOvr></p:sld>" — CT_Slide
//     requires <p:transition> to come after <p:clrMapOvr>, so inserting
//     right before the closing </p:sld> tag is the correct position.
//   - ppt/presProps.xml is emitted as an empty self-closed
//     "<p:presentationPr .../>", safe to expand with a <p:showPr> child.
async function makeSelfRunning(pptxBuffer: ArrayBuffer): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(pptxBuffer);

  const transitionTag =
    `<p:transition spd="med" advClick="0" advTm="${SECONDS_PER_SLIDE * 1000}"><p:fade/></p:transition>`;

  const slidePaths = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
  for (const path of slidePaths) {
    const xml = await zip.file(path)!.async('string');
    zip.file(path, xml.replace('</p:sld>', `${transitionTag}</p:sld>`));
  }

  const presPropsPath = 'ppt/presProps.xml';
  const presPropsXml = await zip.file(presPropsPath)?.async('string');
  if (presPropsXml) {
    zip.file(
      presPropsPath,
      presPropsXml.replace(
        /<p:presentationPr([^>]*)\/>/,
        '<p:presentationPr$1><p:showPr loop="1"><p:present/></p:showPr></p:presentationPr>'
      )
    );
  }

  return zip.generateAsync({ type: 'blob' });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportMinistryUpdatesToPptx(service: ChurchService): Promise<void> {
  // Loaded on demand — pptxgenjs is sizeable and most sessions never export a deck.
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'BULLETIN_16x9', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'BULLETIN_16x9';

  addTitleSlide(pptx, service);
  service.ministryUpdates.forEach((item) => addItemSlide(pptx, item));

  const buffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
  const selfRunningBlob = await makeSelfRunning(buffer);
  downloadBlob(selfRunningBlob, `家事分享　${service.title}.pptx`);
}
