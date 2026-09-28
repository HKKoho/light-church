// packages/api/src/sunday-bulletins/sunday-bulletins.service.ts
import { createHash } from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createLogger } from '@clawix/shared';
import type {
  ArchiveBulletinsInput,
  FailedBulletinImport,
  ImportRosterInput,
  ImportRosterResult,
  ImportSundayBulletinsResult,
  ResetSundayBulletinsResult,
  SaveSundayBulletinsInput,
  SaveSundayBulletinsResult,
  SundayBulletinData,
  SundayBulletinList,
} from '@clawix/shared';

import { BulletinArchiveService } from '../bulletin-archive/bulletin-archive.service.js';
import { AuditLogRepository } from '../db/audit-log.repository.js';
import {
  SundayBulletinRepository,
  type PendingPdfImport,
} from '../db/sunday-bulletin.repository.js';
import type { Prisma } from '../generated/prisma/client.js';
import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import {
  BULLETIN_SYSTEM_PROMPT,
  buildBulletinPrompt,
  extractPdfText,
  parseBulletinReply,
} from './bulletin-pdf-reader.js';
import { extractRosterGrid } from './roster-pdf-layout.js';
import {
  applyRosterMapping,
  buildRosterPrompt,
  calibrateMapping,
  parseRosterMapping,
  ROSTER_SYSTEM_PROMPT,
} from './roster-pdf-reader.js';

const logger = createLogger('sunday-bulletins');

/**
 * The church's shared weekly bulletins for the Sunday Service Bulletin tool.
 * Archiving hides a bulletin from the editor but keeps it in Postgres.
 * Uploaded past-bulletin PDFs are read by AI into bulletins in the background
 * (a 14-page bulletin can take over a minute), so the tool polls the list.
 */
@Injectable()
export class SundayBulletinsService {
  /** BulletinArchive ids being read by AI right now (single API instance). */
  private readonly pending = new Set<string>();
  /** BulletinArchive ids AI could not read, so the tool can say which. */
  private readonly failed = new Map<string, FailedBulletinImport>();

  constructor(
    private readonly repo: SundayBulletinRepository,
    private readonly archive: BulletinArchiveService,
    private readonly llm: OneShotLlmService,
    private readonly audit: AuditLogRepository,
  ) {}

  async list(): Promise<SundayBulletinList> {
    const bulletins = (await this.repo.listActive()) as unknown as SundayBulletinData[];
    return {
      bulletins,
      pendingImports: this.pending.size,
      failedImports: [...this.failed.values()],
    };
  }

  async save(input: SaveSundayBulletinsInput, userId: string): Promise<SaveSundayBulletinsResult> {
    const archived = await this.repo.archivedIds(input.bulletins.map((b) => b.id));
    const entries = input.bulletins
      .filter((b) => !archived.has(b.id))
      .map((b) => ({ id: b.id, title: b.title, data: b as Prisma.InputJsonValue }));
    if (entries.length > 0) await this.repo.saveMany(entries, userId);
    return { saved: entries.length, skippedArchived: [...archived] };
  }

  async archiveBulletin(id: string, userId: string): Promise<void> {
    if (!(await this.repo.archive(id, userId))) {
      throw new NotFoundException('Bulletin not found or already archived');
    }
    await this.audit.create({
      userId,
      action: 'sunday-bulletin.archive',
      resource: 'sunday-bulletin',
      resourceId: id,
    });
  }

  /**
   * Starts the church over: archives every active bulletin (they stay in
   * Postgres), so the editor derives from whatever PDFs are uploaded next.
   */
  async reset(userId: string): Promise<ResetSundayBulletinsResult> {
    const archived = await this.repo.archiveAll(userId);
    await this.audit.create({
      userId,
      action: 'sunday-bulletin.reset',
      resource: 'sunday-bulletin',
      resourceId: 'all',
      details: { archived },
    });
    return { archived };
  }

  /** Archives the PDFs, then reads any not yet turned into a bulletin. */
  async importPdfs(
    input: ArchiveBulletinsInput,
    userId: string,
  ): Promise<ImportSundayBulletinsResult> {
    const { archived, duplicates } = await this.archive.archive(input, userId);
    const hashes = input.files.map((f) =>
      createHash('sha256').update(Buffer.from(f.base64, 'base64')).digest('hex'),
    );
    const todo = (await this.repo.findUnimportedPdfs(input.churchName, hashes)).filter(
      (p) => !this.pending.has(p.archiveId),
    );
    for (const pdf of todo) {
      this.pending.add(pdf.archiveId);
      this.failed.delete(pdf.archiveId);
      void this.readPdf(pdf, userId).finally(() => this.pending.delete(pdf.archiveId));
    }
    return { archived, duplicates, importing: todo.length };
  }

  /** Reads a printed duty roster PDF into roster schedule entries (not stored). */
  async importRoster(input: ImportRosterInput, userId: string): Promise<ImportRosterResult> {
    const content = Buffer.from(input.base64, 'base64');
    if (!content.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new BadRequestException(`"${input.fileName}" is not a PDF`);
    }
    const grid = await extractRosterGrid(new Uint8Array(content));
    const reply = await this.llm.complete({
      system: ROSTER_SYSTEM_PROMPT,
      prompt: buildRosterPrompt(grid, input.examples, input.examplesDate),
      userId,
      usageTag: 'ai-tool:sunday-service-bulletin',
      reasoningEffort: 'minimal',
    });
    const mapping = calibrateMapping(
      grid,
      parseRosterMapping(reply),
      input.examples,
      input.examplesDate,
    );
    const reading = applyRosterMapping(grid, mapping);
    logger.info(
      { fileName: input.fileName, entries: reading.entries.length },
      'Read duty roster from PDF',
    );
    return reading;
  }

  private async readPdf(pdf: PendingPdfImport, userId: string): Promise<void> {
    try {
      const text = await extractPdfText(pdf.content);
      const reply = await this.llm.complete({
        system: BULLETIN_SYSTEM_PROMPT,
        prompt: buildBulletinPrompt(text),
        userId,
        usageTag: 'ai-tool:sunday-service-bulletin',
        // Transcription, not reasoning: gpt-5 at its default effort takes
        // over 3 minutes on a bulletin and outlives the provider timeout.
        reasoningEffort: 'minimal',
      });
      // Timestamped: a PDF read again after a reset must not reuse the id
      // of the bulletin archived from its first reading.
      const bulletin = parseBulletinReply(reply, `pdf-${pdf.archiveId}-${Date.now().toString(36)}`);
      await this.repo.createImported(
        { id: bulletin.id, title: bulletin.title, data: bulletin as Prisma.InputJsonValue },
        pdf.archiveId,
        userId,
      );
      logger.info({ fileName: pdf.fileName, id: bulletin.id }, 'Imported bulletin from PDF');
    } catch (err) {
      logger.warn({ err, fileName: pdf.fileName }, 'Could not read bulletin PDF');
      const reason = err instanceof Error ? err.message : String(err);
      this.failed.set(pdf.archiveId, { fileName: pdf.fileName, reason: reason.slice(0, 300) });
    }
  }
}
