// packages/api/src/sunday-bulletins/__tests__/sunday-bulletins.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';

import type { BulletinArchiveService } from '../../bulletin-archive/bulletin-archive.service.js';
import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { SundayBulletinRepository } from '../../db/sunday-bulletin.repository.js';
import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import { SundayBulletinsService } from '../sunday-bulletins.service.js';

vi.mock('../bulletin-pdf-reader.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../bulletin-pdf-reader.js')>()),
  extractPdfText: vi.fn(async () => '茶果嶺浸信會 主日崇拜 二零二六年九月二十七日'),
}));

const bulletin = (id: string) => ({
  id,
  title: `主日崇拜 ${id}`,
  date: '二零二六年十月四日',
  items: [],
});

describe('SundayBulletinsService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let archive: { archive: ReturnType<typeof vi.fn> };
  let llm: { complete: ReturnType<typeof vi.fn> };
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: SundayBulletinsService;

  beforeEach(() => {
    repo = {
      listActive: vi.fn(async () => [bulletin('b1')]),
      archivedIds: vi.fn(async () => new Set<string>()),
      saveMany: vi.fn(),
      archive: vi.fn(async () => true),
      archiveAll: vi.fn(async () => 3),
      findUnimportedPdfs: vi.fn(async () => []),
      createImported: vi.fn(),
    };
    archive = { archive: vi.fn(async () => ({ archived: 1, duplicates: 0 })) };
    llm = { complete: vi.fn(async () => '{"serviceDate": "2026-09-27"}') };
    audit = { create: vi.fn() };
    service = new SundayBulletinsService(
      repo as unknown as SundayBulletinRepository,
      archive as unknown as BulletinArchiveService,
      llm as unknown as OneShotLlmService,
      audit as unknown as AuditLogRepository,
    );
  });

  it('lists active bulletins', async () => {
    expect(await service.list()).toEqual({
      bulletins: [bulletin('b1')],
      pendingImports: 0,
      failedImports: [],
    });
  });

  it('never brings an archived bulletin back on save', async () => {
    repo['archivedIds']!.mockResolvedValueOnce(new Set(['old']));
    const result = await service.save({ bulletins: [bulletin('old'), bulletin('new')] }, 'u1');
    expect(result).toEqual({ saved: 1, skippedArchived: ['old'] });
    const [entries, userId] = repo['saveMany']!.mock.calls[0] as [{ id: string }[], string];
    expect(entries.map((e) => e.id)).toEqual(['new']);
    expect(userId).toBe('u1');
  });

  it('archives a bulletin and records it in the audit log', async () => {
    await service.archiveBulletin('b1', 'u1');
    expect(repo['archive']).toHaveBeenCalledWith('b1', 'u1');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sunday-bulletin.archive', resourceId: 'b1' }),
    );
  });

  it('resets by archiving every active bulletin and records it in the audit log', async () => {
    expect(await service.reset('u1')).toEqual({ archived: 3 });
    expect(repo['archiveAll']).toHaveBeenCalledWith('u1');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sunday-bulletin.reset', details: { archived: 3 } }),
    );
  });

  it('404s when the bulletin is missing or already archived', async () => {
    repo['archive']!.mockResolvedValueOnce(false);
    await expect(service.archiveBulletin('gone', 'u1')).rejects.toThrow(NotFoundException);
    expect(audit.create).not.toHaveBeenCalled();
  });

  it('archives uploaded PDFs and reads unimported ones into bulletins in the background', async () => {
    let release = (_: string) => {};
    llm.complete.mockReturnValueOnce(new Promise<string>((r) => (release = r)));
    repo['findUnimportedPdfs']!.mockResolvedValueOnce([
      { archiveId: 'arc1', fileName: '0927.pdf', content: new Uint8Array([1]) },
    ]);
    const input = {
      churchName: '茶果嶺浸信會',
      files: [{ name: '0927.pdf', mimeType: 'application/pdf' as const, base64: 'JVBERi0=' }],
    };

    const result = await service.importPdfs(input, 'u1');
    expect(result).toEqual({ archived: 1, duplicates: 0, importing: 1 });
    expect((await service.list()).pendingImports).toBe(1);

    // A second upload while it is still being read does not start it twice.
    repo['findUnimportedPdfs']!.mockResolvedValueOnce([
      { archiveId: 'arc1', fileName: '0927.pdf', content: new Uint8Array([1]) },
    ]);
    expect((await service.importPdfs(input, 'u1')).importing).toBe(0);
    release('{"serviceDate": "2026-09-27"}');

    await vi.waitFor(() => expect(repo['createImported']).toHaveBeenCalled());
    const [entry, archiveId] = repo['createImported']!.mock.calls[0] as [
      { id: string; title: string },
      string,
    ];
    expect(entry.id).toMatch(/^pdf-arc1-[a-z0-9]+$/);
    expect(entry.title).toBe('主日崇拜　二零二六年九月二十七日');
    expect(archiveId).toBe('arc1');
    await vi.waitFor(async () => expect((await service.list()).pendingImports).toBe(0));
  });

  it('reports a PDF the AI cannot read without failing the upload, until a retry reads it', async () => {
    const pdf = { archiveId: 'arc2', fileName: 'bad.pdf', content: new Uint8Array([1]) };
    const input = {
      churchName: 'x',
      files: [{ name: 'bad.pdf', mimeType: 'application/pdf' as const, base64: 'JVBERi0=' }],
    };
    repo['findUnimportedPdfs']!.mockResolvedValueOnce([pdf]);
    llm.complete.mockRejectedValueOnce(new Error('provider down'));
    await service.importPdfs(input, 'u1');
    await vi.waitFor(async () => expect((await service.list()).pendingImports).toBe(0));
    expect(repo['createImported']).not.toHaveBeenCalled();
    expect((await service.list()).failedImports).toEqual([
      { fileName: 'bad.pdf', reason: 'provider down' },
    ]);

    repo['findUnimportedPdfs']!.mockResolvedValueOnce([pdf]);
    await service.importPdfs(input, 'u1');
    await vi.waitFor(() => expect(repo['createImported']).toHaveBeenCalled());
    expect((await service.list()).failedImports).toEqual([]);
  });
});
