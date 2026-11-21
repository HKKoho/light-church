// packages/api/src/theology-library/theology-library.service.ts
//
// Curating the Theology Library: pastors upload readings, review each one
// (approve with doctrine tags, or reject with a note), reprocess and delete.
// Every change is written to the append-only audit log.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MAX_THEOLOGY_FILE_BYTES,
  THEOLOGY_CURATOR_ROLES,
  THEOLOGY_READER_ROLES,
  type ReadingSourceDetail,
  type ReadingSourceSummary,
  type ReviewReadingSourceData,
  type TheologyDoctrineTag,
  type TheologyLanguage,
  type TheologySourceKind,
  type TheologySourceStatus,
  type UploadReadingSourceData,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import {
  TheologyLibraryRepository,
  type ReadingSourceListItem,
} from '../db/theology-library.repository.js';
import type { Prisma, ReadingSource } from '../generated/prisma/client.js';
import { TheologyIngestionService } from './ingestion.service.js';

export interface Actor {
  readonly id: string;
  readonly role: string;
}

export function assertCurator(actor: Actor): void {
  if (!THEOLOGY_CURATOR_ROLES.includes(actor.role)) {
    throw new ForbiddenException('Only pastors can curate the theology library');
  }
}

export function assertReader(actor: Actor): void {
  if (!THEOLOGY_READER_ROLES.includes(actor.role)) {
    throw new ForbiddenException('The theology library is for church staff and leaders');
  }
}

export function toSummary(s: ReadingSourceListItem): ReadingSourceSummary {
  return {
    id: s.id,
    title: s.title,
    author: s.author,
    kind: s.kind as TheologySourceKind,
    language: s.language as TheologyLanguage,
    fileName: s.fileName,
    fileSizeBytes: s.fileSizeBytes,
    pageCount: s.pageCount,
    ocrPagesUsed: s.ocrPagesUsed,
    status: s.status as TheologySourceStatus,
    statusDetail: s.statusDetail,
    doctrineTags: s.doctrineTags as TheologyDoctrineTag[],
    chunkCount: s.chunkCount,
    reviewNote: s.reviewNote,
    reviewedAt: s.reviewedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function toDetail(s: ReadingSource): ReadingSourceDetail {
  return { ...toSummary(s), copyrightNote: s.copyrightNote, content: s.content };
}

@Injectable()
export class TheologyLibraryService {
  constructor(
    private readonly repo: TheologyLibraryRepository,
    private readonly ingestion: TheologyIngestionService,
    private readonly audit: AuditLogRepository,
  ) {}

  private log(
    actor: Actor,
    action: string,
    id: string,
    details: Prisma.InputJsonObject,
  ): Promise<unknown> {
    return this.audit.create({
      userId: actor.id,
      action: `theology-library.${action}`,
      resource: 'ReadingSource',
      resourceId: id,
      details,
    });
  }

  private async get(id: string): Promise<ReadingSource> {
    const source = await this.repo.findSource(id);
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async list(actor: Actor): Promise<ReadingSourceSummary[]> {
    assertReader(actor);
    const all = (await this.repo.listSources()).map(toSummary);
    // Readers only see what is searchable; curators see the whole review queue.
    return THEOLOGY_CURATOR_ROLES.includes(actor.role)
      ? all
      : all.filter((s) => s.status === 'approved');
  }

  async detail(id: string, actor: Actor): Promise<ReadingSourceDetail> {
    assertCurator(actor);
    return toDetail(await this.get(id));
  }

  async upload(input: UploadReadingSourceData, actor: Actor): Promise<ReadingSourceSummary> {
    assertCurator(actor);
    const buffer = Buffer.from(input.base64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_THEOLOGY_FILE_BYTES) {
      throw new BadRequestException('The file is empty or larger than 20 MB');
    }
    const source = await this.repo.createSource({
      title: input.title,
      author: input.author ?? null,
      kind: input.kind,
      language: input.language,
      fileName: input.fileName,
      fileSizeBytes: buffer.length,
      copyrightConfirmed: input.copyrightConfirmed,
      copyrightNote: input.copyrightNote ?? null,
      uploadedById: actor.id,
    });
    await this.log(actor, 'upload', source.id, {
      title: source.title,
      fileName: source.fileName,
      copyrightNote: source.copyrightNote,
    });
    // Extraction (and OCR) can take minutes — run it after the response.
    void this.ingestion.ingestFile(source.id, input.mimeType, buffer, actor.id);
    return toSummary(source);
  }

  async review(
    id: string,
    input: ReviewReadingSourceData,
    actor: Actor,
  ): Promise<ReadingSourceSummary> {
    assertCurator(actor);
    const source = await this.get(id);
    if (source.status === 'processing' || source.status === 'failed') {
      throw new BadRequestException('Only an indexed source can be reviewed');
    }
    const updated = await this.repo.updateSource(id, {
      status: input.status,
      doctrineTags: [...input.doctrineTags],
      reviewNote: input.reviewNote ?? null,
      reviewedById: actor.id,
      reviewedAt: new Date(),
    });
    await this.log(actor, input.status === 'approved' ? 'approve' : 'reject', id, {
      title: source.title,
      from: source.status,
      doctrineTags: [...input.doctrineTags],
      reviewNote: input.reviewNote ?? null,
    });
    return toSummary(updated);
  }

  async reprocess(id: string, actor: Actor): Promise<ReadingSourceSummary> {
    assertCurator(actor);
    const source = await this.get(id);
    if (source.status === 'processing') {
      throw new BadRequestException('This source is already being processed');
    }
    if (!source.content.trim()) {
      throw new BadRequestException('No text was extracted from this file — upload it again');
    }
    // An approved/rejected source keeps its decision; its chunks are swapped atomically.
    const reviewed = source.status === 'approved' || source.status === 'rejected';
    const updated = reviewed
      ? source
      : await this.repo.updateSource(id, { status: 'processing', statusDetail: null });
    await this.log(actor, 'reprocess', id, { title: source.title });
    void this.ingestion.index(id, source.content, actor.id);
    return toSummary(updated);
  }

  async remove(id: string, actor: Actor): Promise<void> {
    assertCurator(actor);
    const source = await this.get(id);
    await this.repo.deleteSource(id);
    await this.log(actor, 'delete', id, {
      title: source.title,
      status: source.status,
      fileName: source.fileName,
    });
  }
}
