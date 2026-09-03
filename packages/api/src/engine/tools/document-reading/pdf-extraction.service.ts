/**
 * PDF text extraction — text layer via pdf-parse, OCR fallback (Tesseract.js,
 * rasterizing pages with pdf-parse's own screenshot renderer) for pages with
 * no usable text layer (scanned pages).
 *
 * Used by the ad-hoc "read this document" tool (see
 * engine/tools/document-conversion.ts and docs/RAGplan.md, Option B) — not
 * part of the curated theological library.
 */
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { createWorker, type Worker } from 'tesseract.js';

import { createLogger } from '@clawix/shared';

import { assemblePdfMarkdown } from './markdown-assembly.js';

const logger = createLogger('engine:document-reading:pdf');

/** Pages with fewer extracted characters than this are treated as having no usable text layer. */
const MIN_TEXT_LENGTH = 20;

/** Hard ceiling on page count — protects the session context budget and OCR cost. */
export const MAX_PDF_PAGES = 300;

export interface PdfPageResult {
  readonly pageNumber: number;
  readonly text: string;
  readonly extracted: boolean;
  readonly ocrUsed: boolean;
}

export interface PdfExtractionResult {
  readonly pageCount: number;
  readonly pages: readonly PdfPageResult[];
  readonly markdown: string;
  readonly ocrPagesUsed: number;
  readonly unextractedPages: number;
}

export class PdfTooLargeError extends Error {
  constructor(pageCount: number) {
    super(
      `PDF has ${pageCount} pages, exceeding the ${MAX_PDF_PAGES}-page limit for ad-hoc reading.`,
    );
    this.name = 'PdfTooLargeError';
  }
}

@Injectable()
export class PdfExtractionService implements OnModuleDestroy {
  private ocrWorkerPromise: Promise<Worker> | null = null;

  async extract(buffer: Buffer): Promise<PdfExtractionResult> {
    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      if (info.total > MAX_PDF_PAGES) {
        throw new PdfTooLargeError(info.total);
      }

      const textResult = await parser.getText();
      const pages: PdfPageResult[] = [];
      for (const page of textResult.pages) {
        const trimmed = page.text.trim();
        if (trimmed.length >= MIN_TEXT_LENGTH) {
          pages.push({ pageNumber: page.num, text: trimmed, extracted: true, ocrUsed: false });
          continue;
        }

        const ocrText = await this.tryOcr(parser, page.num);
        if (ocrText) {
          pages.push({ pageNumber: page.num, text: ocrText, extracted: true, ocrUsed: true });
        } else {
          pages.push({ pageNumber: page.num, text: '', extracted: false, ocrUsed: false });
        }
      }

      const ocrPagesUsed = pages.filter((p) => p.ocrUsed).length;
      const unextractedPages = pages.filter((p) => !p.extracted).length;

      return {
        pageCount: textResult.total,
        pages,
        markdown: assemblePdfMarkdown(pages),
        ocrPagesUsed,
        unextractedPages,
      };
    } finally {
      await parser.destroy();
    }
  }

  private async tryOcr(parser: PDFParse, pageNumber: number): Promise<string | null> {
    try {
      const screenshot = await parser.getScreenshot({
        partial: [pageNumber],
        scale: 2,
        imageDataUrl: true,
        imageBuffer: false,
      });
      const page = screenshot.pages[0];
      if (!page) return null;

      const worker = await this.getOcrWorker();
      const {
        data: { text },
      } = await worker.recognize(page.dataUrl);
      const trimmed = text.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (err) {
      logger.warn({ err, pageNumber }, 'OCR fallback failed for page');
      return null;
    }
  }

  /**
   * Lazily starts one shared Tesseract worker for this service's lifetime —
   * spinning up a fresh worker per page would reload the WASM core and
   * language data every time.
   */
  private getOcrWorker(): Promise<Worker> {
    if (!this.ocrWorkerPromise) {
      const langDataPath = process.env['OCR_LANG_DATA_PATH'];
      this.ocrWorkerPromise = createWorker(
        'eng',
        undefined,
        langDataPath ? { langPath: langDataPath, cachePath: langDataPath } : {},
      );
    }
    return this.ocrWorkerPromise;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.ocrWorkerPromise) return;
    try {
      const worker = await this.ocrWorkerPromise;
      await worker.terminate();
    } catch (err) {
      logger.warn({ err }, 'Failed to terminate OCR worker cleanly');
    } finally {
      this.ocrWorkerPromise = null;
    }
  }
}
