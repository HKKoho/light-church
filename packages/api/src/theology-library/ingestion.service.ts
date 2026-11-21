// packages/api/src/theology-library/ingestion.service.ts
//
// Turns an uploaded file into searchable passages: extract text (PDF with OCR
// fallback, DOCX, Markdown, plain text) → chunk → find Scripture references →
// embed → store. Runs in the background after upload; the source moves from
// `processing` to `pending_review` (or `failed`). Reprocessing re-chunks the
// stored text, so it never re-runs OCR.
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { createLogger, type TheologyUploadMimeType } from '@clawix/shared';

import { EmbeddingService, embeddingModel } from '../engine/embeddings/embedding.service.js';
import { extractDocx } from '../engine/tools/document-reading/docx-extraction.js';
import {
  PdfExtractionService,
  PdfTooLargeError,
} from '../engine/tools/document-reading/pdf-extraction.service.js';
import { TheologyLibraryRepository, type NewChunk } from '../db/theology-library.repository.js';
import { chunkDocument } from './chunking.js';
import { extractScriptureRefs } from './scripture-refs.js';

const logger = createLogger('theology-library:ingestion');

/** A source still `processing` after this long was interrupted (e.g. API restart). */
const STUCK_AFTER_MS = 30 * 60 * 1000;
const USAGE_TAG = 'theology-library:ingest';

export interface Extracted {
  readonly markdown: string;
  readonly pageCount: number | null;
  readonly ocrPagesUsed: number;
}

@Injectable()
export class TheologyIngestionService implements OnApplicationBootstrap {
  constructor(
    private readonly repo: TheologyLibraryRepository,
    private readonly embeddings: EmbeddingService,
    private readonly pdf: PdfExtractionService,
  ) {}

  /** Mark sources an earlier process abandoned as failed, so a curator can reprocess them. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const stuck = await this.repo.findStuckProcessing(new Date(Date.now() - STUCK_AFTER_MS));
      for (const source of stuck) {
        await this.repo.updateSource(source.id, {
          status: 'failed',
          statusDetail: 'Processing was interrupted — reprocess to try again.',
        });
      }
    } catch (err) {
      logger.warn({ err }, 'Could not check for interrupted theology library sources');
    }
  }

  async extract(mimeType: TheologyUploadMimeType, buffer: Buffer): Promise<Extracted> {
    switch (mimeType) {
      case 'application/pdf': {
        const result = await this.pdf.extract(buffer);
        return {
          markdown: result.markdown,
          pageCount: result.pageCount,
          ocrPagesUsed: result.ocrPagesUsed,
        };
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return { markdown: (await extractDocx(buffer)).markdown, pageCount: null, ocrPagesUsed: 0 };
      case 'text/markdown':
      case 'text/plain':
        return { markdown: buffer.toString('utf8'), pageCount: null, ocrPagesUsed: 0 };
    }
  }

  /** Extract, then index. Never throws — failures are recorded on the source. */
  async ingestFile(
    sourceId: string,
    mimeType: TheologyUploadMimeType,
    buffer: Buffer,
    userId: string,
  ): Promise<void> {
    let extracted: Extracted;
    try {
      extracted = await this.extract(mimeType, buffer);
    } catch (err) {
      const detail =
        err instanceof PdfTooLargeError
          ? `${err.message} Split the book into parts and upload each.`
          : 'The file could not be read.';
      await this.fail(sourceId, detail, err);
      return;
    }
    if (!extracted.markdown.trim()) {
      await this.fail(sourceId, 'No text could be extracted from this file.');
      return;
    }
    await this.repo.updateSource(sourceId, {
      content: extracted.markdown,
      pageCount: extracted.pageCount,
      ocrPagesUsed: extracted.ocrPagesUsed,
    });
    await this.index(sourceId, extracted.markdown, userId);
  }

  /** Chunk, embed and store `markdown` for a source. Never throws. */
  async index(sourceId: string, markdown: string, userId: string): Promise<void> {
    try {
      const source = await this.repo.findSource(sourceId);
      if (!source) return; // deleted while processing
      const chunks = chunkDocument(markdown);
      if (chunks.length === 0) {
        await this.fail(sourceId, 'No text could be extracted from this file.');
        return;
      }
      // Title and heading travel with each passage so the vector carries its context.
      const vectors = await this.embeddings.embed({
        texts: chunks.map((c) => [source.title, c.heading, c.text].filter(Boolean).join('\n')),
        userId,
        usageTag: USAGE_TAG,
      });
      const rows: NewChunk[] = chunks.map((c, i) => ({
        chunkIndex: c.index,
        page: c.page,
        heading: c.heading,
        text: c.text,
        tokenCount: c.tokenCount,
        scriptureRefs: extractScriptureRefs(c.text),
        embedding: vectors[i] ?? [],
      }));
      await this.repo.replaceChunks(sourceId, rows);
      // Reprocessing keeps an earlier review decision; anything else waits for review.
      const reviewed = source.status === 'approved' || source.status === 'rejected';
      await this.repo.updateSource(sourceId, {
        status: reviewed ? source.status : 'pending_review',
        statusDetail: null,
        chunkCount: rows.length,
        embeddingModel: embeddingModel(),
      });
      logger.info({ sourceId, chunks: rows.length }, 'Theology library source indexed');
    } catch (err) {
      await this.fail(sourceId, 'Indexing failed — reprocess to try again.', err);
    }
  }

  private async fail(sourceId: string, detail: string, err?: unknown): Promise<void> {
    logger.warn({ err, sourceId }, `Theology library ingestion failed: ${detail}`);
    await this.repo
      .updateSource(sourceId, { status: 'failed', statusDetail: detail })
      .catch((updateErr: unknown) => {
        logger.warn({ err: updateErr, sourceId }, 'Could not record ingestion failure');
      });
  }
}
