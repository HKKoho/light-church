import type PptxGenJS from 'pptxgenjs';

type TextProps = PptxGenJS.TextProps;

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize?: number;
  fontFace?: string;
}

const FONT_SIZE_RE = /^(\d{1,2})pt$/;

// Reads the same font-size/font-family a SPAN can carry after
// sanitizeRichText (see FONT_STACKS there) — falls back to the inherited
// state when the span (or its style) isn't one we recognize.
function spanFontSize(el: HTMLElement): number | undefined {
  const match = FONT_SIZE_RE.exec(el.style.fontSize);
  return match ? parseInt(match[1], 10) : undefined;
}

function spanFontFace(el: HTMLElement): string | undefined {
  const first = el.style.fontFamily?.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
  return first || undefined;
}

function walk(node: Node, state: FormatState, runs: TextProps[]): void {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (!text) return;
      runs.push({
        text,
        options: {
          bold: state.bold || undefined,
          italic: state.italic || undefined,
          underline: state.underline ? { style: 'sng' } : undefined,
          fontSize: state.fontSize,
          fontFace: state.fontFace,
        },
      });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    if (el.tagName === 'BR') {
      // pptxgenjs auto-splits run text on '\n', so no separate breakLine run is needed.
      runs.push({ text: '\n' });
      return;
    }
    walk(el, {
      bold: state.bold || el.tagName === 'B' || el.tagName === 'STRONG',
      italic: state.italic || el.tagName === 'I' || el.tagName === 'EM',
      underline: state.underline || el.tagName === 'U',
      fontSize: el.tagName === 'SPAN' ? spanFontSize(el) ?? state.fontSize : state.fontSize,
      fontFace: el.tagName === 'SPAN' ? spanFontFace(el) ?? state.fontFace : state.fontFace,
    }, runs);
  });
}

/** Converts sanitized rich-text HTML (bold/italic/underline/br/span[font-size,font-family], see sanitizeRichText) into pptxgenjs text runs. */
export function richTextToPptxRuns(html: string): TextProps[] {
  const template = document.createElement('template');
  template.innerHTML = html;
  const runs: TextProps[] = [];
  walk(template.content, { bold: false, italic: false, underline: false }, runs);
  return runs.length > 0 ? runs : [{ text: '' }];
}
