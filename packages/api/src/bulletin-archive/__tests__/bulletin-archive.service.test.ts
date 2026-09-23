// packages/api/src/bulletin-archive/__tests__/bulletin-archive.service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

import type { BulletinArchiveRepository } from '../../db/bulletin-archive.repository.js';
import { BulletinArchiveService } from '../bulletin-archive.service.js';

const pdf = (text: string) => Buffer.from(`%PDF-1.4\n${text}\n%%EOF`).toString('base64');

describe('BulletinArchiveService', () => {
  let repo: { archiveMany: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
  let service: BulletinArchiveService;

  beforeEach(() => {
    repo = {
      archiveMany: vi.fn(async (entries: readonly unknown[]) => entries.length),
      list: vi.fn(),
    };
    service = new BulletinArchiveService(repo as unknown as BulletinArchiveRepository);
  });

  it('stores each PDF with its hash, size and uploader', async () => {
    const result = await service.archive(
      {
        churchName: '茶果嶺浸信會',
        files: [
          { name: '0816.pdf', mimeType: 'application/pdf', base64: pdf('a') },
          { name: '0823.pdf', mimeType: 'application/pdf', base64: pdf('b') },
        ],
      },
      'user-1',
    );

    expect(result).toEqual({ archived: 2, duplicates: 0 });
    const [entries] = repo.archiveMany.mock.calls[0] as [
      { fileName: string; sha256: string; size: number; uploadedById: string }[],
    ];
    expect(entries.map((e) => e.fileName)).toEqual(['0816.pdf', '0823.pdf']);
    expect(entries[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(entries[0]?.uploadedById).toBe('user-1');
    expect(entries[0]?.size).toBe(Buffer.from(pdf('a'), 'base64').length);
  });

  it('counts files already in the archive (or repeated in one upload) as duplicates', async () => {
    repo.archiveMany.mockResolvedValueOnce(1); // one of the two unique files already existed
    const result = await service.archive(
      {
        churchName: 'Light Church',
        files: [
          { name: 'a.pdf', mimeType: 'application/pdf', base64: pdf('same') },
          { name: 'a-copy.pdf', mimeType: 'application/pdf', base64: pdf('same') },
          { name: 'b.pdf', mimeType: 'application/pdf', base64: pdf('other') },
        ],
      },
      'user-1',
    );
    expect((repo.archiveMany.mock.calls[0] as [unknown[]])[0]).toHaveLength(2);
    expect(result).toEqual({ archived: 1, duplicates: 2 });
  });

  it('rejects files that are not really PDFs', async () => {
    await expect(
      service.archive(
        {
          churchName: 'Light Church',
          files: [
            {
              name: 'fake.pdf',
              mimeType: 'application/pdf',
              base64: Buffer.from('<html>').toString('base64'),
            },
          ],
        },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.archiveMany).not.toHaveBeenCalled();
  });

  it('lists metadata with ISO dates', async () => {
    repo.list.mockResolvedValue([
      { id: '1', churchName: 'LC', fileName: 'a.pdf', size: 10, createdAt: new Date('2026-09-20') },
    ]);
    await expect(service.list('LC')).resolves.toEqual([
      {
        id: '1',
        churchName: 'LC',
        fileName: 'a.pdf',
        size: 10,
        createdAt: '2026-09-20T00:00:00.000Z',
      },
    ]);
  });
});
