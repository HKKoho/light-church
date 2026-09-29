import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WISDOM_COURSE_ID, saveWisdomCourseSchema } from '@clawix/shared';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { WisdomRepository } from '../../db/wisdom.repository.js';
import { WisdomCoursesService } from '../wisdom-courses.service.js';

const pastor = { id: 'u-pastor', role: 'pastor' };
const member = { id: 'u-member', role: 'member' };

const course = (id: string, published: boolean, statuses: string[] = []) => ({
  id,
  title: id,
  description: '',
  readingLabels: [],
  published,
  sortOrder: 0,
  cycles: [{ modules: statuses.map((status) => ({ status })) }],
});

function fakeRepo() {
  const rows = new Map<string, ReturnType<typeof course>>([
    [WISDOM_COURSE_ID, course(WISDOM_COURSE_ID, true, ['published', 'draft'])],
  ]);
  let seq = 0;
  return {
    rows,
    listCoursesWithModules: vi.fn(async () => [...rows.values()]),
    listCourses: vi.fn(async (published?: boolean) =>
      [...rows.values()].filter((r) => published === undefined || r.published === published),
    ),
    findCourse: vi.fn(async (id: string) => rows.get(id) ?? null),
    createCourse: vi.fn(async (d: Record<string, unknown>) => {
      const row = { ...course(`k${++seq}`, false), cycles: [], ...d };
      rows.set(row.id, row);
      return row;
    }),
    updateCourse: vi.fn(async (id: string, d: Record<string, unknown>) => {
      const row = { ...rows.get(id)!, ...d };
      rows.set(id, row);
      return row;
    }),
    deleteCourse: vi.fn(async (id: string) => rows.delete(id)),
  };
}

describe('WisdomCoursesService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: WisdomCoursesService;
  const input = saveWisdomCourseSchema.parse({
    title: '加拉太書',
    readingLabels: ['律法', '福音', '生活'],
  });

  beforeEach(() => {
    repo = fakeRepo();
    audit = { create: vi.fn() };
    service = new WisdomCoursesService(
      repo as unknown as WisdomRepository,
      audit as unknown as AuditLogRepository,
    );
  });

  it('only lets editors manage courses', async () => {
    await expect(service.listAdmin(member)).rejects.toThrow(ForbiddenException);
    await expect(service.create(input, member)).rejects.toThrow(ForbiddenException);
    await expect(service.publish(WISDOM_COURSE_ID, { published: false }, member)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('counts cycles, modules and published modules', async () => {
    const [wisdom] = await service.listAdmin(pastor);
    expect(wisdom).toMatchObject({ cycles: 1, modules: 2, publishedModules: 1 });
  });

  it('creates a course unpublished, then publishes it on the church website', async () => {
    const created = await service.create(input, pastor);
    expect(created).toMatchObject({ published: false, readingLabels: ['律法', '福音', '生活'] });
    expect((await service.listPublished()).map((c) => c.id)).toEqual([WISDOM_COURSE_ID]);

    await service.publish(created.id, { published: true }, pastor);
    expect((await service.listPublished()).map((c) => c.id)).toContain(created.id);
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'wisdom.course.publish', resourceId: created.id }),
    );
  });

  it('unpublishes Wisdom in Bible but never deletes it', async () => {
    await service.publish(WISDOM_COURSE_ID, { published: false }, pastor);
    expect(await service.listPublished()).toEqual([]);
    await expect(service.remove(WISDOM_COURSE_ID, pastor)).rejects.toThrow(BadRequestException);
  });

  it('deletes other courses', async () => {
    const created = await service.create(input, pastor);
    await service.remove(created.id, pastor);
    await expect(service.get(created.id, pastor)).rejects.toThrow(NotFoundException);
  });
});
