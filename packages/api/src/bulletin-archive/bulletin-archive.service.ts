// packages/api/src/bulletin-archive/bulletin-archive.service.ts
import { createHash } from 'crypto';

import { BadRequestException, Injectable } from '@nestjs/common';
import { createLogger, MAX_ARCHIVE_FILE_BYTES } from '@clawix/shared';
import type {
  ArchiveBulletinsInput,
  ArchiveBulletinsResult,
  BulletinArchiveEntry,
} from '@clawix/shared';

import {
  BulletinArchiveRepository,
  type NewBulletinArchive,
} from '../db/bulletin-archive.repository.js';

const logger = createLogger('bulletin-archive');

const PDF_MAGIC = Buffer.from('%PDF-');

/**
 * Archives past Sunday service bulletins (PDF) in Postgres. The archive is
 * write-and-keep: it never feeds the weekly bulletin editor, and is kept for
 * the later AI stage that learns a church's bulletin format.
 */
@Injectable()
export class BulletinArchiveService {
  constructor(private readonly repo: BulletinArchiveRepository) {}

  async archive(input: ArchiveBulletinsInput, userId: string): Promise<ArchiveBulletinsResult> {
    const seen = new Set<string>();
    const entries: NewBulletinArchive[] = [];

    for (const file of input.files) {
      const content = Buffer.from(file.base64, 'base64');
      if (content.length === 0 || content.length > MAX_ARCHIVE_FILE_BYTES) {
        throw new BadRequestException(`"${file.name}" is empty or larger than 10 MB`);
      }
      if (!content.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
        throw new BadRequestException(`"${file.name}" is not a PDF`);
      }
      const sha256 = createHash('sha256').update(content).digest('hex');
      if (seen.has(sha256)) continue; // same file twice in one upload
      seen.add(sha256);
      entries.push({
        churchName: input.churchName,
        fileName: file.name,
        mimeType: file.mimeType,
        size: content.length,
        sha256,
        content: new Uint8Array(content),
        uploadedById: userId,
      });
    }

    const archived = await this.repo.archiveMany(entries);
    const duplicates = input.files.length - archived;
    logger.info(
      { churchName: input.churchName, archived, duplicates, userId },
      'Archived past bulletins',
    );
    return { archived, duplicates };
  }

  async list(churchName?: string): Promise<BulletinArchiveEntry[]> {
    const rows = await this.repo.list(churchName);
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }
}
