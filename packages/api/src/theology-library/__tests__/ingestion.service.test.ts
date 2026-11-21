// packages/api/src/theology-library/__tests__/ingestion.service.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { TheologyLibraryRepository } from '../../db/theology-library.repository.js';
import type { EmbeddingService } from '../../engine/embeddings/embedding.service.js';
import {
  PdfTooLargeError,
  type PdfExtractionService,
} from '../../engine/tools/document-reading/pdf-extraction.service.js';
import type { ReadingSource } from '../../generated/prisma/client.js';
import { TheologyIngestionService } from '../ingestion.service.js';
import { sourceRow } from './fixtures.js';

vi.mock('../../engine/tools/document-reading/docx-extraction.js', () => ({
  extractDocx: vi.fn(async () => ({
    markdown: '# Docx\n\nFrom Word, see John 3:16.',
    warnings: [],
  })),
}));

function make(found: ReadingSource | null = sourceRow({ status: 'processing' })) {
  const repo = {
    findSource: vi.fn(async () => found),
    updateSource: vi.fn(async () => sourceRow()),
    replaceChunks: vi.fn(async () => undefined),
    findStuckProcessing: vi.fn(async () => [sourceRow({ id: 'stuck' })]),
  };
  const embeddings = {
    embed: vi.fn(async ({ texts }: { texts: string[] }) => texts.map(() => [0.5])),
  };
  const pdf = {
    extract: vi.fn(async () => ({
      pageCount: 2,
      pages: [],
      markdown: '## Page 1\n\nGrace alone, Eph 2:8.',
      ocrPagesUsed: 1,
      unextractedPages: 0,
    })),
  };
  const service = new TheologyIngestionService(
    repo as unknown as TheologyLibraryRepository,
    embeddings as unknown as EmbeddingService,
    pdf as unknown as PdfExtractionService,
  );
  return { service, repo, embeddings, pdf };
}

describe('TheologyIngestionService', () => {
  it('extracts a PDF, indexes its passages and waits for review', async () => {
    const { service, repo, embeddings } = make();
    await service.ingestFile('src-1', 'application/pdf', Buffer.from('%PDF'), 'u1');

    expect(repo.updateSource).toHaveBeenCalledWith('src-1', {
      content: '## Page 1\n\nGrace alone, Eph 2:8.',
      pageCount: 2,
      ocrPagesUsed: 1,
    });
    expect(embeddings.embed).toHaveBeenCalledWith({
      texts: ['Institutes\nGrace alone, Eph 2:8.'],
      userId: 'u1',
      usageTag: 'theology-library:ingest',
    });
    expect(repo.replaceChunks).toHaveBeenCalledWith('src-1', [
      expect.objectContaining({
        chunkIndex: 0,
        page: 1,
        scriptureRefs: ['EPH 2', 'EPH 2:8'],
        embedding: [0.5],
      }),
    ]);
    expect(repo.updateSource).toHaveBeenLastCalledWith(
      'src-1',
      expect.objectContaining({ status: 'pending_review', chunkCount: 1 }),
    );
  });

  it('reads Word, Markdown and plain text', async () => {
    const { service } = make();
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    expect((await service.extract(docx, Buffer.from(''))).markdown).toContain('From Word');
    expect((await service.extract('text/plain', Buffer.from('Plain'))).markdown).toBe('Plain');
    expect((await service.extract('text/markdown', Buffer.from('# Md'))).pageCount).toBeNull();
  });

  it('keeps an earlier review decision when reprocessing', async () => {
    const { service, repo } = make(sourceRow({ status: 'approved' }));
    await service.index('src-1', 'Some text', 'u1');
    expect(repo.updateSource).toHaveBeenLastCalledWith(
      'src-1',
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('explains an over-long PDF', async () => {
    const { service, repo, pdf } = make();
    pdf.extract.mockRejectedValueOnce(new PdfTooLargeError(400));
    await service.ingestFile('src-1', 'application/pdf', Buffer.from('%PDF'), 'u1');
    expect(repo.updateSource).toHaveBeenCalledWith('src-1', {
      status: 'failed',
      statusDetail: expect.stringContaining('Split the book'),
    });
  });

  it('fails a file with no text', async () => {
    const { service, repo } = make();
    await service.ingestFile('src-1', 'text/plain', Buffer.from('   '), 'u1');
    expect(repo.updateSource).toHaveBeenCalledWith('src-1', {
      status: 'failed',
      statusDetail: 'No text could be extracted from this file.',
    });
  });

  it('records an embedding failure instead of throwing', async () => {
    const { service, repo, embeddings } = make();
    embeddings.embed.mockRejectedValueOnce(new Error('rate limited'));
    await expect(service.index('src-1', 'Text', 'u1')).resolves.toBeUndefined();
    expect(repo.updateSource).toHaveBeenCalledWith('src-1', {
      status: 'failed',
      statusDetail: 'Indexing failed — reprocess to try again.',
    });
  });

  it('does nothing for a source deleted mid-way', async () => {
    const { service, embeddings } = make(null);
    await service.index('gone', 'Text', 'u1');
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it('marks sources abandoned by a restart as failed', async () => {
    const { service, repo } = make();
    await service.onApplicationBootstrap();
    expect(repo.updateSource).toHaveBeenCalledWith('stuck', {
      status: 'failed',
      statusDetail: expect.stringContaining('interrupted'),
    });
  });
});
