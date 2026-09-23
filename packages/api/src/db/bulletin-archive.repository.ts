import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface NewBulletinArchive {
  readonly churchName: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly sha256: string;
  readonly content: Uint8Array<ArrayBuffer>;
  readonly uploadedById: string | null;
}

export interface BulletinArchiveMeta {
  readonly id: string;
  readonly churchName: string;
  readonly fileName: string;
  readonly size: number;
  readonly createdAt: Date;
}

@Injectable()
export class BulletinArchiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Inserts new bulletins, skipping any already archived for the church (same sha256). */
  async archiveMany(entries: readonly NewBulletinArchive[]): Promise<number> {
    if (entries.length === 0) return 0;
    const result = await this.prisma.bulletinArchive.createMany({
      data: entries.map((e) => ({ ...e })),
      skipDuplicates: true,
    });
    return result.count;
  }

  /** Metadata only — PDF content is never returned in listings. */
  async list(churchName?: string, take = 200): Promise<BulletinArchiveMeta[]> {
    return this.prisma.bulletinArchive.findMany({
      where: churchName ? { churchName } : {},
      select: { id: true, churchName: true, fileName: true, size: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
