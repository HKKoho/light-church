import { Injectable } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SundayBulletinUpsert {
  readonly id: string;
  readonly title: string;
  readonly data: Prisma.InputJsonValue;
}

export interface PendingPdfImport {
  readonly archiveId: string;
  readonly fileName: string;
  readonly content: Uint8Array;
}

@Injectable()
export class SundayBulletinRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Active (not archived) bulletins' JSON, oldest first. */
  async listActive(): Promise<Prisma.JsonValue[]> {
    const rows = await this.prisma.sundayBulletin.findMany({
      where: { archivedAt: null },
      select: { data: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.data);
  }

  async archivedIds(ids: readonly string[]): Promise<Set<string>> {
    const rows = await this.prisma.sundayBulletin.findMany({
      where: { id: { in: [...ids] }, archivedAt: { not: null } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  /** Upserts active bulletins. Callers filter out archived ids first. */
  async saveMany(entries: readonly SundayBulletinUpsert[], userId: string): Promise<void> {
    await this.prisma.$transaction(
      entries.map((e) =>
        this.prisma.sundayBulletin.upsert({
          where: { id: e.id },
          create: { id: e.id, title: e.title, data: e.data, updatedById: userId },
          update: { title: e.title, data: e.data, updatedById: userId },
        }),
      ),
    );
  }

  /** Returns false when no active bulletin has this id. */
  async archive(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.sundayBulletin.updateMany({
      where: { id, archivedAt: null },
      data: { archivedAt: new Date(), archivedById: userId },
    });
    return result.count > 0;
  }

  /** Archives every active bulletin (a reset); returns how many. */
  async archiveAll(userId: string): Promise<number> {
    const result = await this.prisma.sundayBulletin.updateMany({
      where: { archivedAt: null },
      data: { archivedAt: new Date(), archivedById: userId },
    });
    return result.count;
  }

  /**
   * Archived PDFs (by hash) with no active bulletin read from them — never
   * read, or read into a bulletin that has since been archived (e.g. by a
   * reset), so uploading the PDF again reads it afresh.
   */
  async findUnimportedPdfs(
    churchName: string,
    sha256s: readonly string[],
  ): Promise<PendingPdfImport[]> {
    const rows = await this.prisma.bulletinArchive.findMany({
      where: {
        churchName,
        sha256: { in: [...sha256s] },
        OR: [{ sundayBulletin: null }, { sundayBulletin: { archivedAt: { not: null } } }],
      },
      select: { id: true, fileName: true, content: true },
    });
    return rows.map((r) => ({ archiveId: r.id, fileName: r.fileName, content: r.content }));
  }

  async createImported(
    entry: SundayBulletinUpsert,
    archiveId: string,
    userId: string,
  ): Promise<void> {
    // An archived bulletin read earlier from the same PDF keeps its content
    // but gives up the (unique) link to it.
    await this.prisma.$transaction([
      this.prisma.sundayBulletin.updateMany({
        where: { sourceArchiveId: archiveId, archivedAt: { not: null } },
        data: { sourceArchiveId: null },
      }),
      this.prisma.sundayBulletin.create({
        data: {
          id: entry.id,
          title: entry.title,
          data: entry.data,
          sourceArchiveId: archiveId,
          updatedById: userId,
        },
      }),
    ]);
  }
}
