// packages/api/src/theology-library/chunking.ts
//
// Splits an extracted document (Markdown; PDFs carry "## Page N" markers from
// engine/tools/document-reading/markdown-assembly.ts) into passages of about
// TARGET_TOKENS, keeping paragraphs whole where possible, tagging each passage
// with its page and nearest heading, and repeating a little of the previous
// passage so a thought split across a boundary is still findable.

export const TARGET_TOKENS = 600;
export const MAX_TOKENS = 800;
export const OVERLAP_TOKENS = 90;

export interface Chunk {
  readonly index: number;
  readonly page: number | null;
  readonly heading: string;
  readonly text: string;
  readonly tokenCount: number;
}

interface Block {
  readonly text: string;
  readonly page: number | null;
  readonly heading: string;
  readonly tokens: number;
}

const PAGE_RE = /^##\s+Page\s+(\d+)\s*$/;
const HEADING_RE = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const SKIP_RE = /^(\[UNEXTRACTED[^\]]*\]|\*\(recovered via OCR\)\*)$/;
const CJK_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[，。、；：？！「」『』（）《》〈〉…—～]/gu;
// Sentence ends: Chinese punctuation, or . ! ? followed by space.
const SENTENCE_RE = /(?<=[。！？；])|(?<=[.!?])\s+/;

/** Rough token count: one per CJK character, one per four other characters. */
export function estimateTokens(text: string): number {
  const cjk = text.match(CJK_RE)?.length ?? 0;
  return cjk + Math.ceil((text.length - cjk) / 4);
}

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let page: number | null = null;
  let heading = '';
  let para: string[] = [];

  const flush = () => {
    const text = para.join('\n').trim();
    para = [];
    if (!text) return;
    for (const piece of splitLong(text)) {
      blocks.push({ text: piece, page, heading, tokens: estimateTokens(piece) });
    }
  };

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const pageMatch = PAGE_RE.exec(line);
    if (pageMatch) {
      flush();
      page = Number(pageMatch[1]);
      continue;
    }
    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch?.[1]) {
      flush();
      heading = headingMatch[1].slice(0, 200);
      continue;
    }
    if (!line) {
      flush();
      continue;
    }
    if (SKIP_RE.test(line)) continue;
    para.push(line);
  }
  flush();
  return blocks;
}

/** Break an over-long paragraph at sentence ends, hard-cutting only as a last resort. */
function splitLong(text: string): string[] {
  if (estimateTokens(text) <= MAX_TOKENS) return [text];
  const pieces: string[] = [];
  let current = '';
  for (const sentence of text.split(SENTENCE_RE)) {
    if (!sentence) continue;
    const joined = current ? `${current} ${sentence}` : sentence;
    if (current && estimateTokens(joined) > TARGET_TOKENS) {
      pieces.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) pieces.push(current);
  return pieces.flatMap(hardCut);
}

function hardCut(text: string): string[] {
  if (estimateTokens(text) <= MAX_TOKENS) return [text];
  // Mostly-CJK text has ~1 token per char; otherwise ~4 chars per token.
  const perChar = estimateTokens(text) / text.length;
  const size = Math.max(1, Math.floor(TARGET_TOKENS / perChar));
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export function chunkDocument(markdown: string): Chunk[] {
  const blocks = toBlocks(markdown);
  const chunks: Chunk[] = [];
  let current: Block[] = [];
  let tokens = 0;
  let fresh = 0; // blocks in `current` that are not overlap from the previous chunk

  const emit = () => {
    if (fresh === 0) return;
    const first = current[0];
    if (!first) return;
    const text = current.map((blk) => blk.text).join('\n\n');
    chunks.push({
      index: chunks.length,
      page: current.find((blk) => blk.page !== null)?.page ?? null,
      heading: current[current.length - 1]?.heading ?? first.heading,
      text,
      tokenCount: estimateTokens(text),
    });
    // Carry trailing blocks that fit in the overlap budget into the next chunk.
    const carry: Block[] = [];
    let carried = 0;
    for (let i = current.length - 1; i > 0; i--) {
      const blk = current[i];
      if (!blk || carried + blk.tokens > OVERLAP_TOKENS) break;
      carry.unshift(blk);
      carried += blk.tokens;
    }
    current = carry;
    tokens = carried;
    fresh = 0;
  };

  for (const block of blocks) {
    if (fresh > 0 && tokens + block.tokens > TARGET_TOKENS) emit();
    current.push(block);
    tokens += block.tokens;
    fresh++;
  }
  emit();
  return chunks;
}
