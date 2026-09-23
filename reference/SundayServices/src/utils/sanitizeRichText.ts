// Body text fields can now carry inline bold/italic/underline/font-size/
// font-family markup produced by RichTextField's floating toolbar. Since
// that markup is stored as HTML and later rendered with
// dangerouslySetInnerHTML (in TextBlockList, and by extension
// CongregationView / FullBulletinPrintDocument / print), every value must be
// run through this allow-list sanitizer first — both when saving from the
// editor AND when rendering, since content can also arrive via the "restore
// backup" JSON upload (bulletinBackup.ts), which is not trusted input.
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR']);

// Font-family values are re-derived from this table (keyed by the bare
// family name, quotes stripped) rather than trusted verbatim, so the
// sanitized output is always one of these exact known-safe stacks —
// immune to however a given browser happens to quote/reorder the value.
export const FONT_STACKS: Record<string, string> = {
  'Noto Serif TC': "'Noto Serif TC', Georgia, serif",
  'Noto Sans TC': "'Noto Sans TC', sans-serif",
  'Microsoft JhengHei': "'Microsoft JhengHei', sans-serif",
};

const FONT_SIZE_RE = /^(\d{1,2})pt$/;
const MIN_FONT_PT = 6;
const MAX_FONT_PT = 72;

function primaryFontFamily(value: string): string | null {
  const first = value.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
  return first || null;
}

// SPAN survives only when it carries a recognized font-size and/or
// font-family — every other attribute (and any other style property) is
// dropped. Returns false when nothing valid survived, so the caller can
// unwrap the tag entirely.
function cleanSpanStyle(el: HTMLElement): boolean {
  const fontSize = el.style.fontSize;
  const fontFamily = el.style.fontFamily;
  while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);

  const parts: string[] = [];
  const sizeMatch = FONT_SIZE_RE.exec(fontSize);
  if (sizeMatch) {
    const pt = Math.min(MAX_FONT_PT, Math.max(MIN_FONT_PT, parseInt(sizeMatch[1], 10)));
    parts.push(`font-size:${pt}pt`);
  }
  const primary = fontFamily ? primaryFontFamily(fontFamily) : null;
  if (primary && FONT_STACKS[primary]) {
    parts.push(`font-family:${FONT_STACKS[primary]}`);
  }
  if (parts.length === 0) return false;
  el.setAttribute('style', parts.join(';'));
  return true;
}

function sanitizeNode(node: Node): void {
  let child = node.firstChild;
  while (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      child = child.nextSibling;
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.tagName === 'SPAN') {
        if (cleanSpanStyle(el)) {
          sanitizeNode(el);
          child = el.nextSibling;
          continue;
        }
        // No recognized style survived: unwrap it like any disallowed tag.
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        node.removeChild(el);
        child = node.firstChild;
        continue;
      }
      if (ALLOWED_TAGS.has(el.tagName)) {
        while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name);
        sanitizeNode(el);
        child = el.nextSibling;
        continue;
      }
      // Disallowed element: unwrap it (keep its text/children, drop the tag),
      // then re-scan from this level's start since children just moved here.
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      child = node.firstChild;
      continue;
    }
    // Comments, etc. — drop.
    const toRemove = child;
    child = child.nextSibling;
    node.removeChild(toRemove);
  }
}

/** Strips everything except bold/italic/underline/line-break markup and plain text. */
export function sanitizeRichText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNode(template.content);
  return template.innerHTML;
}

/** Plain-text version of a (possibly rich) body, for contexts that can't render HTML. */
export function richTextToPlainText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichText(html);
  template.content.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  return template.content.textContent ?? '';
}
