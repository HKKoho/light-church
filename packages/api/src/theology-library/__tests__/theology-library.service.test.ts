// packages/api/src/theology-library/__tests__/theology-library.service.test.ts
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { TheologyLibraryRepository } from '../../db/theology-library.repository.js';
import type { ReadingSource } from '../../generated/prisma/client.js';
import type { TheologyIngestionService } from '../ingestion.service.js';
import { TheologyLibraryService, assertReader } from '../theology-library.service.js';
import { deacon, pastor, sourceRow, volunteer } from './fixtures.js';

function make(found: ReadingSource | null = sourceRow()) {
  const repo = {
    listSources: vi.fn(async () => [
      sourceRow({ id: 'a', status: 'approved' }),
      sourceRow({ id: 'b', status: 'pending_review' }),
    ]),
    findSource: vi.fn(async () => found),
    createSource: vi.fn(async (data: Partial<ReadingSource>) =>
      sourceRow({ ...data, status: 'processing' }),
    ),
    updateSource: vi.fn(async (_id: string, data: Partial<ReadingSource>) =>
      sourceRow({ ...found, ...data }),
    ),
    deleteSource: vi.fn(async () => undefined),
  };
  const ingestion = {
    ingestFile: vi.fn(async () => undefined),
    index: vi.fn(async () => undefined),
  };
  const audit = { create: vi.fn(async () => ({})) };
  const service = new TheologyLibraryService(
    repo as unknown as TheologyLibraryRepository,
    ingestion as unknown as TheologyIngestionService,
    audit as unknown as AuditLogRepository,
  );
  return { service, repo, ingestion, audit };
}

const upload = {
  title: 'Institutes',
  kind: 'systematic' as const,
  language: 'en' as const,
  fileName: 'institutes.md',
  mimeType: 'text/markdown' as const,
  base64: Buffer.from('# Book\n\nText').toString('base64'),
  copyrightConfirmed: true as const,
  author: undefined,
  copyrightNote: undefined,
};

describe('TheologyLibraryService', () => {
  it('lets curators manage and staff read, but not volunteers', async () => {
    const { service } = make();
    await expect(service.list(volunteer)).rejects.toThrow(ForbiddenException);
    await expect(service.upload(upload, deacon)).rejects.toThrow(ForbiddenException);
    await expect(service.detail('src-1', deacon)).rejects.toThrow(ForbiddenException);
    expect(() => assertReader(deacon)).not.toThrow();
  });

  it('shows readers only approved sources and curators the review queue', async () => {
    const { service } = make();
    expect((await service.list(deacon)).map((s) => s.id)).toEqual(['a']);
    expect((await service.list(pastor)).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('returns a source with its extracted text', async () => {
    const { service } = make();
    const detail = await service.detail('src-1', pastor);
    expect(detail.content).toContain('Knowledge of God');
    expect(detail.copyrightNote).toBe('Public domain');
    expect(detail.createdAt).toBe('2026-11-21T00:00:00.000Z');
  });

  it('stores an upload, audits it and indexes in the background', async () => {
    const { service, repo, ingestion, audit } = make();
    const result = await service.upload(upload, pastor);
    expect(result.status).toBe('processing');
    expect(repo.createSource).toHaveBeenCalledWith(
      expect.objectContaining({ fileSizeBytes: 12, uploadedById: 'pastor-1', author: null }),
    );
    expect(ingestion.ingestFile).toHaveBeenCalledWith(
      'src-1',
      'text/markdown',
      expect.any(Buffer),
      'pastor-1',
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'theology-library.upload', resource: 'ReadingSource' }),
    );
  });

  it('rejects an empty file', async () => {
    const { service } = make();
    await expect(service.upload({ ...upload, base64: '' }, pastor)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('approves with doctrine tags and records who reviewed', async () => {
    const { service, repo, audit } = make();
    const result = await service.review(
      'src-1',
      { status: 'approved', doctrineTags: ['reformed'], reviewNote: undefined },
      pastor,
    );
    expect(result.status).toBe('approved');
    expect(repo.updateSource).toHaveBeenCalledWith(
      'src-1',
      expect.objectContaining({ doctrineTags: ['reformed'], reviewedById: 'pastor-1' }),
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'theology-library.approve' }),
    );
  });

  it('records a rejection', async () => {
    const { service, audit } = make();
    await service.review(
      'src-1',
      { status: 'rejected', doctrineTags: [], reviewNote: 'Off topic' },
      pastor,
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'theology-library.reject' }),
    );
  });

  it('will not review a source that is not indexed', async () => {
    const { service } = make(sourceRow({ status: 'failed' }));
    await expect(
      service.review(
        'src-1',
        { status: 'approved', doctrineTags: [], reviewNote: undefined },
        pastor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('reports a missing source', async () => {
    const { service } = make(null);
    await expect(service.detail('nope', pastor)).rejects.toThrow(NotFoundException);
  });

  it('reprocesses a failed source from its stored text', async () => {
    const { service, repo, ingestion } = make(sourceRow({ status: 'failed' }));
    const result = await service.reprocess('src-1', pastor);
    expect(result.status).toBe('processing');
    expect(repo.updateSource).toHaveBeenCalledWith('src-1', {
      status: 'processing',
      statusDetail: null,
    });
    expect(ingestion.index).toHaveBeenCalledWith(
      'src-1',
      expect.stringContaining('Knowledge'),
      'pastor-1',
    );
  });

  it('keeps an approval while reprocessing', async () => {
    const { service, repo } = make(sourceRow({ status: 'approved' }));
    expect((await service.reprocess('src-1', pastor)).status).toBe('approved');
    expect(repo.updateSource).not.toHaveBeenCalled();
  });

  it('refuses to reprocess while processing or with no text', async () => {
    await expect(
      make(sourceRow({ status: 'processing' })).service.reprocess('src-1', pastor),
    ).rejects.toThrow(BadRequestException);
    await expect(
      make(sourceRow({ content: ' ' })).service.reprocess('src-1', pastor),
    ).rejects.toThrow(BadRequestException);
  });

  it('deletes and audits', async () => {
    const { service, repo, audit } = make();
    await service.remove('src-1', pastor);
    expect(repo.deleteSource).toHaveBeenCalledWith('src-1');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'theology-library.delete', resourceId: 'src-1' }),
    );
  });
});
