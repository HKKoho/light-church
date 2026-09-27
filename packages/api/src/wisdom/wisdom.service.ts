// packages/api/src/wisdom/wisdom.service.ts
//
// Wisdom in Bible: pastors, ministry leaders and admin staff edit the course
// (cycles and modules); any signed-in member takes published modules, saves
// answers, and sees what others answered — anonymously.
import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  WISDOM_EDITOR_ROLES,
  WISDOM_SUMMARY_KEY,
  wisdomDiscussionKey,
  type SaveWisdomAnswersInput,
  type SaveWisdomCycleInput,
  type SaveWisdomModuleData,
  type WisdomAdminCycle,
  type WisdomCycleInfo,
  type WisdomMemberCycle,
  type WisdomMemberModule,
  type WisdomModuleDetail,
  type WisdomQuestionInsight,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { WisdomRepository } from '../db/wisdom.repository.js';
import type { Prisma, WisdomModule } from '../generated/prisma/client.js';
import { readAnswers, toCycleInfo, toModuleDetail, toModuleSummary } from './wisdom.mappers.js';

export interface Actor {
  readonly id: string;
  readonly role: string;
}

const EDITORS: ReadonlySet<string> = new Set(WISDOM_EDITOR_ROLES);
/** Open answers shown per question in the anonymous insight. */
const SAMPLES = 12;
const SAMPLE_CHARS = 500;

function assertEditor(actor: Actor): void {
  if (!EDITORS.has(actor.role)) {
    throw new ForbiddenException('Only pastors, ministry leaders and admin staff can do this');
  }
}

/** Keys a member may answer for a module: its question ids, discussion prompts and summary. */
function answerKeys(module: WisdomModuleDetail): Set<string> {
  return new Set([
    ...module.lifeQuestions.map((q) => q.id),
    ...module.discussionPrompts.map((_, i) => wisdomDiscussionKey(i)),
    WISDOM_SUMMARY_KEY,
  ]);
}

function moduleData(
  input: SaveWisdomModuleData,
): Omit<Prisma.WisdomModuleUncheckedCreateInput, 'id'> {
  return {
    cycleId: input.cycleId,
    title: input.title,
    subtitle: input.subtitle,
    sortOrder: input.sortOrder,
    status: input.status,
    // New questions get an id so members' answers stay attached when others are reordered.
    lifeQuestions: input.lifeQuestions.map((q) => ({ ...q, id: q.id || randomUUID() })),
    perspectives: input.perspectives,
    tensionGuide: input.tensionGuide,
    tensionGuideAudioUrl: input.tensionGuideAudioUrl,
    discussionPrompts: input.discussionPrompts,
    summary: input.summary,
  };
}

@Injectable()
export class WisdomService {
  constructor(
    private readonly repo: WisdomRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  private log(actor: Actor, action: string, id: string, title: string) {
    return this.audit.create({
      userId: actor.id,
      action: `wisdom.${action}`,
      resource: 'wisdom',
      resourceId: id,
      details: { title },
    });
  }

  // ── Staff ────────────────────────────────────────────────────────────

  async listAdmin(actor: Actor): Promise<WisdomAdminCycle[]> {
    assertEditor(actor);
    const [cycles, counts] = await Promise.all([
      this.repo.listCycles(),
      this.repo.responseCounts(),
    ]);
    return cycles.map((c) => ({
      ...toCycleInfo(c),
      modules: c.modules.map((m) => ({
        ...toModuleSummary(m),
        ...(counts.get(m.id) ?? { responses: 0, completed: 0 }),
      })),
    }));
  }

  async createCycle(input: SaveWisdomCycleInput, actor: Actor): Promise<WisdomCycleInfo> {
    assertEditor(actor);
    const row = await this.repo.createCycle(input);
    await this.log(actor, 'cycle.create', row.id, row.title);
    return toCycleInfo(row);
  }

  async updateCycle(
    id: string,
    input: SaveWisdomCycleInput,
    actor: Actor,
  ): Promise<WisdomCycleInfo> {
    assertEditor(actor);
    if (!(await this.repo.findCycle(id))) throw new NotFoundException('Cycle not found');
    const row = await this.repo.updateCycle(id, input);
    await this.log(actor, 'cycle.update', id, row.title);
    return toCycleInfo(row);
  }

  /** Deletes the cycle with its modules and members' answers to them. */
  async deleteCycle(id: string, actor: Actor): Promise<void> {
    assertEditor(actor);
    const row = await this.repo.findCycle(id);
    if (!row) throw new NotFoundException('Cycle not found');
    await this.repo.deleteCycle(id);
    await this.log(actor, 'cycle.delete', id, row.title);
  }

  async getModule(id: string, actor: Actor): Promise<WisdomModuleDetail> {
    assertEditor(actor);
    return toModuleDetail(await this.findModule(id));
  }

  async createModule(input: SaveWisdomModuleData, actor: Actor): Promise<WisdomModuleDetail> {
    assertEditor(actor);
    await this.assertCycle(input.cycleId);
    const row = await this.repo.createModule(moduleData(input));
    await this.log(actor, 'module.create', row.id, row.title);
    return toModuleDetail(row);
  }

  async updateModule(
    id: string,
    input: SaveWisdomModuleData,
    actor: Actor,
  ): Promise<WisdomModuleDetail> {
    assertEditor(actor);
    await this.findModule(id);
    await this.assertCycle(input.cycleId);
    const row = await this.repo.updateModule(id, moduleData(input));
    await this.log(actor, 'module.update', id, row.title);
    return toModuleDetail(row);
  }

  async deleteModule(id: string, actor: Actor): Promise<void> {
    assertEditor(actor);
    const row = await this.findModule(id);
    await this.repo.deleteModule(id);
    await this.log(actor, 'module.delete', id, row.title);
  }

  // ── Members ──────────────────────────────────────────────────────────

  /** Cycles with published modules only; empty cycles are left out. */
  async listForMember(userId: string): Promise<WisdomMemberCycle[]> {
    const [cycles, responses] = await Promise.all([
      this.repo.listCycles(['published']),
      this.repo.listUserResponses(userId),
    ]);
    const mine = new Map(responses.map((r) => [r.moduleId, r]));
    return cycles
      .filter((c) => c.modules.length > 0)
      .map((c) => ({
        ...toCycleInfo(c),
        modules: c.modules.map((m) => ({
          ...toModuleSummary(m),
          started: mine.has(m.id),
          completed: !!mine.get(m.id)?.completedAt,
        })),
      }));
  }

  async getForMember(id: string, userId: string): Promise<WisdomMemberModule> {
    const module = toModuleDetail(await this.findPublished(id));
    const response = await this.repo.findResponse(userId, id);
    return {
      module,
      answers: readAnswers(response?.answers),
      completed: !!response?.completedAt,
    };
  }

  /** Saves the answers given (blank ones dropped); `completed` marks the module finished. */
  async saveAnswers(
    id: string,
    userId: string,
    input: SaveWisdomAnswersInput,
  ): Promise<WisdomMemberModule> {
    const module = toModuleDetail(await this.findPublished(id));
    const keys = answerKeys(module);
    const answers = Object.fromEntries(
      Object.entries(input.answers)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([k, v]) => keys.has(k) && v !== ''),
    );
    const existing = await this.repo.findResponse(userId, id);
    const completedAt = input.completed ? (existing?.completedAt ?? new Date()) : undefined;
    const row = await this.repo.saveResponse(userId, id, answers, completedAt);
    return { module, answers: readAnswers(row.answers), completed: !!row.completedAt };
  }

  /** Other members' answers to the module's life questions, without names. */
  async insight(id: string, userId: string): Promise<WisdomQuestionInsight[]> {
    const module = toModuleDetail(await this.findPublished(id));
    const peers = (await this.repo.listPeerResponses(id, userId)).map((r) =>
      readAnswers(r.answers),
    );
    return module.lifeQuestions.map((q) => {
      const given = peers.map((a) => a[q.id]?.trim() ?? '').filter(Boolean);
      const counts: Record<string, number> = {};
      if (q.type === 'multi_choice') {
        for (const option of q.options) counts[option] = 0;
        for (const answer of given) counts[answer] = (counts[answer] ?? 0) + 1;
      }
      return {
        questionId: q.id,
        respondents: given.length,
        counts,
        samples:
          q.type === 'open' ? given.slice(0, SAMPLES).map((a) => a.slice(0, SAMPLE_CHARS)) : [],
      };
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async findModule(id: string): Promise<WisdomModule> {
    const row = await this.repo.findModule(id);
    if (!row) throw new NotFoundException('Module not found');
    return row;
  }

  private async findPublished(id: string): Promise<WisdomModule> {
    const row = await this.repo.findModule(id);
    if (!row || row.status !== 'published') throw new NotFoundException('Module not found');
    return row;
  }

  private async assertCycle(id: string): Promise<void> {
    if (!(await this.repo.findCycle(id))) throw new NotFoundException('Cycle not found');
  }
}
