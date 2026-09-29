// packages/api/src/wisdom/wisdom-courses.service.ts
//
// Courses on the Wisdom in Bible template: staff create Sunday School courses,
// rename their reading slots, and publish or unpublish any course (Wisdom in
// Bible included) on the church website. The original course cannot be deleted.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  WISDOM_COURSE_ID,
  type PublishWisdomCourseInput,
  type SaveWisdomCourseInput,
  type WisdomAdminCourse,
  type WisdomCourseInfo,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { WisdomRepository } from '../db/wisdom.repository.js';
import type { WisdomCourse } from '../generated/prisma/client.js';
import { toCourseInfo } from './wisdom.mappers.js';
import { assertEditor, type Actor } from './wisdom.service.js';

@Injectable()
export class WisdomCoursesService {
  constructor(
    private readonly repo: WisdomRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  private log(actor: Actor, action: string, id: string, title: string) {
    return this.audit.create({
      userId: actor.id,
      action: `wisdom.course.${action}`,
      resource: 'wisdom',
      resourceId: id,
      details: { title },
    });
  }

  /** Every course with how many cycles, modules and published modules it has. */
  async listAdmin(actor: Actor): Promise<WisdomAdminCourse[]> {
    assertEditor(actor);
    const rows = await this.repo.listCoursesWithModules();
    return rows.map((row) => {
      const modules = row.cycles.flatMap((c) => c.modules);
      return {
        ...toCourseInfo(row),
        cycles: row.cycles.length,
        modules: modules.length,
        publishedModules: modules.filter((m) => m.status === 'published').length,
      };
    });
  }

  async get(id: string, actor: Actor): Promise<WisdomCourseInfo> {
    assertEditor(actor);
    return toCourseInfo(await this.find(id));
  }

  /** New courses start unpublished, so staff can add lessons first. */
  async create(input: SaveWisdomCourseInput, actor: Actor): Promise<WisdomCourseInfo> {
    assertEditor(actor);
    const row = await this.repo.createCourse(input);
    await this.log(actor, 'create', row.id, row.title);
    return toCourseInfo(row);
  }

  async update(id: string, input: SaveWisdomCourseInput, actor: Actor): Promise<WisdomCourseInfo> {
    assertEditor(actor);
    await this.find(id);
    const row = await this.repo.updateCourse(id, input);
    await this.log(actor, 'update', id, row.title);
    return toCourseInfo(row);
  }

  async publish(
    id: string,
    input: PublishWisdomCourseInput,
    actor: Actor,
  ): Promise<WisdomCourseInfo> {
    assertEditor(actor);
    await this.find(id);
    const row = await this.repo.updateCourse(id, { published: input.published });
    await this.log(actor, input.published ? 'publish' : 'unpublish', id, row.title);
    return toCourseInfo(row);
  }

  /** Deletes the course with its cycles, modules and members' answers. */
  async remove(id: string, actor: Actor): Promise<void> {
    assertEditor(actor);
    if (id === WISDOM_COURSE_ID) {
      throw new BadRequestException('Wisdom in Bible cannot be deleted; unpublish it instead');
    }
    const row = await this.find(id);
    await this.repo.deleteCourse(id);
    await this.log(actor, 'delete', id, row.title);
  }

  /** Courses shown on the church website; anyone may list them. */
  async listPublished(): Promise<WisdomCourseInfo[]> {
    return (await this.repo.listCourses(true)).map(toCourseInfo);
  }

  private async find(id: string): Promise<WisdomCourse> {
    const row = await this.repo.findCourse(id);
    if (!row) throw new NotFoundException('Course not found');
    return row;
  }
}
