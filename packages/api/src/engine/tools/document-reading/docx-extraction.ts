/**
 * DOCX → Markdown conversion: mammoth (docx → HTML, from the file's native
 * XML — no OCR needed, it's already structured text) → turndown (HTML →
 * Markdown), the same HTML-to-Markdown pipeline already used for web
 * content (tools/web/content-extractor.ts).
 *
 * mammoth also ships a convertToMarkdown at runtime, but its published type
 * declarations don't include it (only convertToHtml) — going through
 * turndown keeps this fully typed with no `any` casts.
 */
import mammoth from 'mammoth';
import TurndownService from 'turndown';

export interface DocxExtractionResult {
  readonly markdown: string;
  readonly warnings: readonly string[];
}

export async function extractDocx(buffer: Buffer): Promise<DocxExtractionResult> {
  const result = await mammoth.convertToHtml({ buffer });
  const turndown = new TurndownService({ headingStyle: 'atx' });
  const markdown = turndown.turndown(result.value);
  return {
    markdown,
    warnings: result.messages.map((m) => m.message),
  };
}
