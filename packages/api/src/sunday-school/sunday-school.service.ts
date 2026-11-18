// packages/api/src/sunday-school/sunday-school.service.ts
//
// Sunday School Studio records: class profiles, courses and their lessons.
// Pastors, ministry leaders and admin staff use it; every change is audited.
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SUNDAY_SCHOOL_EDITOR_ROLES,
  type SaveSundaySchoolLessonData,
  type SaveSundaySchoolProfileData,
  type SundaySchoolCourseDetail,
  type SundaySchoolCourseSummary,
  type SundaySchoolLessonDetail,
  type SundaySchoolLessonSummary,
  type SundaySchoolProfileInfo,
  type SundaySchoolSyllabusWeek,
  type UpdateSundaySchoolCourseInput,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import {
  SundaySchoolRepository,
  type SundaySchoolCourseWithLessons,
  type SundaySchoolLessonWithCourse,
  type SundaySchoolProfileWithCount,
} from '../db/sunday-school.repository.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  toCourseDetail,
  toCourseSummary,
  toLessonDetail,
  toLessonSummary,
  toProfileInfo,
} from './sunday-school.mappers.js';

export interface Actor {
  readonly id: string;
  readonly role: string;
}

export function assertEditor(actor: Actor): void {
  if (!SUNDAY_SCHOOL_EDITOR_ROLES.includes(actor.role)) {
    throw new ForbiddenException('Only pastors, ministry leaders and admin staff can do this');
  }
}

@Injectable()
export class SundaySchoolService {
  constructor(
    private readonly repo: SundaySchoolRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  log(actor: Actor, action: string, id: string, details: Prisma.InputJsonObject): Promise<unknown> {
    return this.audit.create({
      userId: actor.id,
      action: `sunday-school.${action}`,
      resource: 'sunday-school',
      resourceId: id,
      details,
    });
  }

  // --- Profiles -------------------------------------------------------------

  async listProfiles(actor: Actor): Promise<SundaySchoolProfileInfo[]> {
    assertEditor(actor);
    return (await this.repo.listProfiles()).map(toProfileInfo);
  }

  async findProfile(id: string): Promise<SundaySchoolProfileWithCount> {
    const row = await this.repo.findProfile(id);
    if (!row) throw new NotFoundException('Class profile not found');
    return row;
  }

  async createProfile(
    input: SaveSundaySchoolProfileData,
    actor: Actor,
  ): Promise<SundaySchoolProfileInfo> {
    assertEditor(actor);
    const row = await this.repo.createProfile(input);
    await this.log(actor, 'profile.create', row.id, { name: row.name });
    return toProfileInfo(row);
  }

  async updateProfile(
    id: string,
    input: SaveSundaySchoolProfileData,
    actor: Actor,
  ): Promise<SundaySchoolProfileInfo> {
    assertEditor(actor);
    await this.findProfile(id);
    const row = await this.repo.updateProfile(id, input);
    await this.log(actor, 'profile.update', id, { name: row.name });
    return toProfileInfo(row);
  }

  async removeProfile(id: string, actor: Actor): Promise<void> {
    assertEditor(actor);
    const row = await this.findProfile(id);
    if (row._count.courses > 0) {
      throw new ConflictException('Courses still use this class profile — delete them first');
    }
    await this.repo.deleteProfile(id);
    await this.log(actor, 'profile.delete', id, { name: row.name });
  }

  // --- Courses --------------------------------------------------------------

  async listCourses(actor: Actor): Promise<SundaySchoolCourseSummary[]> {
    assertEditor(actor);
    return (await this.repo.listCourses()).map(toCourseSummary);
  }

  async findCourse(id: string): Promise<SundaySchoolCourseWithLessons> {
    const row = await this.repo.findCourse(id);
    if (!row) throw new NotFoundException('Course not found');
    return row;
  }

  async getCourse(id: string, actor: Actor): Promise<SundaySchoolCourseDetail> {
    assertEditor(actor);
    return toCourseDetail(await this.findCourse(id));
  }

  async updateCourse(
    id: string,
    input: UpdateSundaySchoolCourseInput,
    actor: Actor,
  ): Promise<SundaySchoolCourseDetail> {
    assertEditor(actor);
    const before = await this.findCourse(id);
    const row = await this.repo.updateCourse(id, input);
    if (before.syllabusApproved !== input.syllabusApproved) {
      const action = input.syllabusApproved ? 'syllabus.approve' : 'syllabus.reopen';
      await this.log(actor, action, id, { title: row.title });
    }
    return toCourseDetail(row);
  }

  async removeCourse(id: string, actor: Actor): Promise<void> {
    assertEditor(actor);
    const row = await this.findCourse(id);
    await this.repo.deleteCourse(id);
    await this.log(actor, 'course.delete', id, { title: row.title });
  }

  // --- Lessons --------------------------------------------------------------

  async findLesson(id: string): Promise<SundaySchoolLessonWithCourse> {
    const row = await this.repo.findLesson(id);
    if (!row) throw new NotFoundException('Lesson not found');
    return row;
  }

  async getLesson(id: string, actor: Actor): Promise<SundaySchoolLessonDetail> {
    assertEditor(actor);
    return toLessonDetail(await this.findLesson(id));
  }

  /** Teacher edits. Approving needs at least one teaching block. */
  async updateLesson(
    id: string,
    input: SaveSundaySchoolLessonData,
    actor: Actor,
  ): Promise<SundaySchoolLessonDetail> {
    assertEditor(actor);
    const before = await this.findLesson(id);
    if (input.status === 'approved' && input.blocks.length === 0) {
      throw new BadRequestException('Prepare the lesson before approving it');
    }
    const row = await this.repo.updateLesson(id, input);
    if (before.status !== input.status) {
      await this.log(actor, `lesson.${input.status}`, id, { title: row.title });
    }
    return toLessonDetail(row);
  }

  /** Syllabus edits to one week, before the lesson is prepared. */
  async updateOutline(
    id: string,
    input: SundaySchoolSyllabusWeek,
    actor: Actor,
  ): Promise<SundaySchoolLessonSummary> {
    assertEditor(actor);
    await this.findLesson(id);
    return toLessonSummary(await this.repo.updateLesson(id, input));
  }
}
