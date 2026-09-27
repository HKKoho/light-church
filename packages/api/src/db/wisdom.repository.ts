import { Injectable } from '@nestjs/common';

import type {
  Prisma,
  WisdomCycle,
  WisdomModule,
  WisdomResponse,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Recent answers read for a module's anonymous insight. */
const INSIGHT_LIMIT = 200;

export type WisdomCycleWithModules = WisdomCycle & { modules: WisdomModule[] };

/** Wisdom in Bible: course cycles, modules and members' answers. */
@Injectable()
export class WisdomRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cycles in order with their modules; `statuses` limits which modules are included. */
  listCycles(statuses?: readonly string[]): Promise<WisdomCycleWithModules[]> {
    return this.prisma.wisdomCycle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        modules: {
          where: statuses ? { status: { in: [...statuses] } } : {},
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  findCycle(id: string): Promise<WisdomCycle | null> {
    return this.prisma.wisdomCycle.findUnique({ where: { id } });
  }

  createCycle(data: Prisma.WisdomCycleCreateInput): Promise<WisdomCycle> {
    return this.prisma.wisdomCycle.create({ data });
  }

  updateCycle(id: string, data: Prisma.WisdomCycleUpdateInput): Promise<WisdomCycle> {
    return this.prisma.wisdomCycle.update({ where: { id }, data });
  }

  deleteCycle(id: string): Promise<WisdomCycle> {
    return this.prisma.wisdomCycle.delete({ where: { id } });
  }

  findModule(id: string): Promise<WisdomModule | null> {
    return this.prisma.wisdomModule.findUnique({ where: { id } });
  }

  createModule(data: Prisma.WisdomModuleUncheckedCreateInput): Promise<WisdomModule> {
    return this.prisma.wisdomModule.create({ data });
  }

  updateModule(id: string, data: Prisma.WisdomModuleUncheckedUpdateInput): Promise<WisdomModule> {
    return this.prisma.wisdomModule.update({ where: { id }, data });
  }

  deleteModule(id: string): Promise<WisdomModule> {
    return this.prisma.wisdomModule.delete({ where: { id } });
  }

  /** Per module: how many members answered and how many finished. */
  async responseCounts(): Promise<Map<string, { responses: number; completed: number }>> {
    const [all, done] = await Promise.all([
      this.prisma.wisdomResponse.groupBy({ by: ['moduleId'], _count: { _all: true } }),
      this.prisma.wisdomResponse.groupBy({
        by: ['moduleId'],
        where: { completedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const counts = new Map<string, { responses: number; completed: number }>();
    for (const row of all) counts.set(row.moduleId, { responses: row._count._all, completed: 0 });
    for (const row of done) {
      const entry = counts.get(row.moduleId);
      if (entry) entry.completed = row._count._all;
    }
    return counts;
  }

  listUserResponses(userId: string): Promise<WisdomResponse[]> {
    return this.prisma.wisdomResponse.findMany({ where: { userId } });
  }

  findResponse(userId: string, moduleId: string): Promise<WisdomResponse | null> {
    return this.prisma.wisdomResponse.findUnique({
      where: { userId_moduleId: { userId, moduleId } },
    });
  }

  saveResponse(
    userId: string,
    moduleId: string,
    answers: Prisma.InputJsonValue,
    completedAt: Date | null | undefined,
  ): Promise<WisdomResponse> {
    return this.prisma.wisdomResponse.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      create: { userId, moduleId, answers, completedAt: completedAt ?? null },
      update: { answers, ...(completedAt !== undefined ? { completedAt } : {}) },
    });
  }

  /** Other members' most recent answers to a module. */
  listPeerResponses(moduleId: string, excludeUserId: string): Promise<WisdomResponse[]> {
    return this.prisma.wisdomResponse.findMany({
      where: { moduleId, userId: { not: excludeUserId } },
      orderBy: { updatedAt: 'desc' },
      take: INSIGHT_LIMIT,
    });
  }
}
