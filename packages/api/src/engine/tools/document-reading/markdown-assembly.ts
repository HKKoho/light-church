/**
 * Assembles per-page PDF extraction results into a single Markdown document.
 */
import type { PdfPageResult } from './pdf-extraction.service.js';

export function assemblePdfMarkdown(pages: readonly PdfPageResult[]): string {
  return pages
    .map((page) => {
      const heading = `## Page ${page.pageNumber}`;
      if (!page.extracted) {
        return `${heading}\n\n[UNEXTRACTED: no text layer and OCR could not recover this page]`;
      }
      const suffix = page.ocrUsed ? '\n\n*(recovered via OCR)*' : '';
      return `${heading}\n\n${page.text}${suffix}`;
    })
    .join('\n\n');
}
