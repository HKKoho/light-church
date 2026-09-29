import { Injectable } from '@nestjs/common';

import type {
  Prisma,
  WisdomCourse,
  WisdomCycle,
  WisdomModule,
  WisdomResponse,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Recent answers read for a module's anonymous insight. */
const INSIGHT_LIMIT = 200;

export type WisdomCycleWithModules = WisdomCycle & { modules: WisdomModule[] };
/** A module with the course it belongs to, for reading labels and publish state. */
export type WisdomModuleWithCourse = WisdomModule & { cycle: { course: WisdomCourse } };
export type WisdomCourseWithModules = WisdomCourse & {
  cycles: { modules: Pick<WisdomModule, 'status'>[] }[];
};

const withCourse = { cycle: { select: { course: true } } } as const;
const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

/** Wisdom in Bible and Sunday School courses: cycles, modules and members' answers. */
@Injectable()
export class WisdomRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Courses in order; `published` limits them to those on the church website. */
  listCourses(published?: boolean): Promise<WisdomCourse[]> {
    return this.prisma.wisdomCourse.findMany({
      where: published === undefined ? {} : { published },
      orderBy: [...ORDER],
    });
  }

  /** Every course with its modules' statuses, for the staff counts. */
  listCoursesWithModules(): Promise<WisdomCourseWithModules[]> {
    return this.prisma.wisdomCourse.findMany({
      orderBy: [...ORDER],
      include: { cycles: { select: { modules: { select: { status: true } } } } },
    });
  }

  findCourse(id: string): Promise<WisdomCourse | null> {
    return this.prisma.wisdomCourse.findUnique({ where: { id } });
  }

  createCourse(data: Prisma.WisdomCourseCreateInput): Promise<WisdomCourse> {
    return this.prisma.wisdomCourse.create({ data });
  }

  updateCourse(id: string, data: Prisma.WisdomCourseUpdateInput): Promise<WisdomCourse> {
    return this.prisma.wisdomCourse.update({ where: { id }, data });
  }

  deleteCourse(id: string): Promise<WisdomCourse> {
    return this.prisma.wisdomCourse.delete({ where: { id } });
  }

  /** A course's cycles in order with their modules; `statuses` limits which modules are included. */
  listCycles(courseId: string, statuses?: readonly string[]): Promise<WisdomCycleWithModules[]> {
    return this.prisma.wisdomCycle.findMany({
      where: { courseId },
      orderBy: [...ORDER],
      include: {
        modules: {
          where: statuses ? { status: { in: [...statuses] } } : {},
          orderBy: [...ORDER],
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

  findModule(id: string): Promise<WisdomModuleWithCourse | null> {
    return this.prisma.wisdomModule.findUnique({ where: { id }, include: withCourse });
  }

  createModule(data: Prisma.WisdomModuleUncheckedCreateInput): Promise<WisdomModuleWithCourse> {
    return this.prisma.wisdomModule.create({ data, include: withCourse });
  }

  updateModule(
    id: string,
    data: Prisma.WisdomModuleUncheckedUpdateInput,
  ): Promise<WisdomModuleWithCourse> {
    return this.prisma.wisdomModule.update({ where: { id }, data, include: withCourse });
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
