// packages/api/src/db/theology-library.repository.ts
//
// Theology Library storage. Sources go through Prisma; chunk embeddings and the
// three searches (meaning, keyword, Scripture reference) use raw SQL because
// Prisma has no pgvector type. Every search is limited to APPROVED sources in
// SQL — that filter is the doctrinal guarantee, so it never lives in callers.
import { Injectable } from '@nestjs/common';

import { Prisma, type ReadingSource } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ReadingSourceListItem = Omit<ReadingSource, 'content'>;

export interface NewChunk {
  readonly chunkIndex: number;
  readonly page: number | null;
  readonly heading: string;
  readonly text: string;
  readonly tokenCount: number;
  readonly scriptureRefs: readonly string[];
  readonly embedding: readonly number[];
}

export interface PassageFilter {
  readonly kinds?: readonly string[] | undefined;
  /** Traditions allowed besides untagged (general) sources; undefined = all. */
  readonly doctrineTags?: readonly string[] | undefined;
}

export interface PassageRow {
  readonly chunkId: string;
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly author: string | null;
  readonly kind: string;
  readonly page: number | null;
  readonly heading: string;
  readonly text: string;
  readonly scriptureRefs: string[];
  /** Cosine distance for meaning search, similarity for keyword, 0 for reference. */
  readonly metric: number;
}

const INSERT_BATCH = 50;

export const toVectorLiteral = (v: readonly number[]) => `[${v.join(',')}]`;

const PASSAGE_COLUMNS = Prisma.sql`
  c.id AS "chunkId", c."sourceId", s.title AS "sourceTitle", s.author, s.kind,
  c.page, c.heading, c.text, c."scriptureRefs"`;

function approvedWhere(filter: PassageFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`s.status = 'approved'`];
  if (filter.kinds && filter.kinds.length > 0) {
    parts.push(Prisma.sql`s.kind = ANY(${[...filter.kinds]}::text[])`);
  }
  if (filter.doctrineTags) {
    parts.push(
      Prisma.sql`(s."doctrineTags" = '{}' OR s."doctrineTags" && ${[...filter.doctrineTags]}::text[])`,
    );
  }
  return Prisma.join(parts, ' AND ');
}

@Injectable()
export class TheologyLibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  listSources(): Promise<ReadingSourceListItem[]> {
    return this.prisma.readingSource.findMany({
      orderBy: { updatedAt: 'desc' },
      omit: { content: true },
    });
  }

  findSource(id: string): Promise<ReadingSource | null> {
    return this.prisma.readingSource.findUnique({ where: { id } });
  }

  createSource(data: Prisma.ReadingSourceCreateInput): Promise<ReadingSource> {
    return this.prisma.readingSource.create({ data });
  }

  updateSource(id: string, data: Prisma.ReadingSourceUpdateInput): Promise<ReadingSource> {
    return this.prisma.readingSource.update({ where: { id }, data });
  }

  async deleteSource(id: string): Promise<void> {
    await this.prisma.readingSource.delete({ where: { id } });
  }

  /** Sources left mid-ingestion by an API restart. */
  findStuckProcessing(olderThan: Date): Promise<ReadingSourceListItem[]> {
    return this.prisma.readingSource.findMany({
      where: { status: 'processing', updatedAt: { lt: olderThan } },
      omit: { content: true },
    });
  }

  /** Replace all of a source's chunks in one transaction. */
  async replaceChunks(sourceId: string, chunks: readonly NewChunk[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.readingChunk.deleteMany({ where: { sourceId } });
      for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
        const rows = chunks.slice(i, i + INSERT_BATCH).map(
          (c) => Prisma.sql`(
            ${`${sourceId}-${c.chunkIndex}`}, ${sourceId}, ${c.chunkIndex}, ${c.page},
            ${c.heading}, ${c.text}, ${c.tokenCount}, ${[...c.scriptureRefs]}::text[],
            ${toVectorLiteral(c.embedding)}::vector)`,
        );
        await tx.$executeRaw`
          INSERT INTO "ReadingChunk"
            (id, "sourceId", "chunkIndex", page, heading, text, "tokenCount", "scriptureRefs", embedding)
          VALUES ${Prisma.join(rows)}`;
      }
    });
  }

  /** Nearest passages by meaning (cosine distance, smaller is closer). */
  searchByVector(
    vector: readonly number[],
    filter: PassageFilter,
    limit: number,
  ): Promise<PassageRow[]> {
    return this.prisma.$queryRaw<PassageRow[]>`
      SELECT ${PASSAGE_COLUMNS}, (c.embedding <=> ${toVectorLiteral(vector)}::vector) AS metric
      FROM "ReadingChunk" c JOIN "ReadingSource" s ON s.id = c."sourceId"
      WHERE ${approvedWhere(filter)} AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${toVectorLiteral(vector)}::vector
      LIMIT ${limit}`;
  }

  /** Passages containing the query's words — trigram similarity, works for Chinese too. */
  searchByKeyword(query: string, filter: PassageFilter, limit: number): Promise<PassageRow[]> {
    return this.prisma.$queryRaw<PassageRow[]>`
      SELECT ${PASSAGE_COLUMNS}, word_similarity(${query}, c.text) AS metric
      FROM "ReadingChunk" c JOIN "ReadingSource" s ON s.id = c."sourceId"
      WHERE ${approvedWhere(filter)} AND ${query} <% c.text
      ORDER BY metric DESC
      LIMIT ${limit}`;
  }

  /** Passages citing any of the given chapter keys ("ROM 8"). */
  searchByRefs(
    keys: readonly string[],
    filter: PassageFilter,
    limit: number,
  ): Promise<PassageRow[]> {
    if (keys.length === 0) return Promise.resolve([]);
    return this.prisma.$queryRaw<PassageRow[]>`
      SELECT ${PASSAGE_COLUMNS}, 0::float AS metric
      FROM "ReadingChunk" c JOIN "ReadingSource" s ON s.id = c."sourceId"
      WHERE ${approvedWhere(filter)} AND c."scriptureRefs" && ${[...keys]}::text[]
      ORDER BY c."sourceId", c."chunkIndex"
      LIMIT ${limit}`;
  }
}
