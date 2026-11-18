import { Injectable } from '@nestjs/common';

import type {
  Prisma,
  SundaySchoolCourse,
  SundaySchoolLesson,
  SundaySchoolProfile,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SundaySchoolProfileWithCount = SundaySchoolProfile & { _count: { courses: number } };
export type SundaySchoolCourseWithLessons = SundaySchoolCourse & {
  profile: Pick<SundaySchoolProfile, 'name'>;
  lessons: SundaySchoolLesson[];
};
export type SundaySchoolLessonWithCourse = SundaySchoolLesson & {
  course: SundaySchoolCourse & { profile: SundaySchoolProfileWithCount };
};

const withCount = { _count: { select: { courses: true } } } as const;
const withLessons = {
  profile: { select: { name: true } },
  lessons: { orderBy: { weekNumber: 'asc' } },
} as const;

/** Sunday School Studio: class profiles, courses and their weekly lessons. */
@Injectable()
export class SundaySchoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  listProfiles(): Promise<SundaySchoolProfileWithCount[]> {
    return this.prisma.sundaySchoolProfile.findMany({
      orderBy: { name: 'asc' },
      include: withCount,
    });
  }

  findProfile(id: string): Promise<SundaySchoolProfileWithCount | null> {
    return this.prisma.sundaySchoolProfile.findUnique({ where: { id }, include: withCount });
  }

  createProfile(
    data: Prisma.SundaySchoolProfileCreateInput,
  ): Promise<SundaySchoolProfileWithCount> {
    return this.prisma.sundaySchoolProfile.create({ data, include: withCount });
  }

  updateProfile(
    id: string,
    data: Prisma.SundaySchoolProfileUpdateInput,
  ): Promise<SundaySchoolProfileWithCount> {
    return this.prisma.sundaySchoolProfile.update({ where: { id }, data, include: withCount });
  }

  deleteProfile(id: string): Promise<SundaySchoolProfile> {
    return this.prisma.sundaySchoolProfile.delete({ where: { id } });
  }

  listCourses(): Promise<SundaySchoolCourseWithLessons[]> {
    return this.prisma.sundaySchoolCourse.findMany({
      orderBy: { updatedAt: 'desc' },
      include: withLessons,
    });
  }

  findCourse(id: string): Promise<SundaySchoolCourseWithLessons | null> {
    return this.prisma.sundaySchoolCourse.findUnique({ where: { id }, include: withLessons });
  }

  /** Creates the course with its lessons in one write. */
  createCourse(data: Prisma.SundaySchoolCourseCreateInput): Promise<SundaySchoolCourseWithLessons> {
    return this.prisma.sundaySchoolCourse.create({ data, include: withLessons });
  }

  updateCourse(
    id: string,
    data: Prisma.SundaySchoolCourseUpdateInput,
  ): Promise<SundaySchoolCourseWithLessons> {
    return this.prisma.sundaySchoolCourse.update({ where: { id }, data, include: withLessons });
  }

  deleteCourse(id: string): Promise<SundaySchoolCourse> {
    return this.prisma.sundaySchoolCourse.delete({ where: { id } });
  }

  findLesson(id: string): Promise<SundaySchoolLessonWithCourse | null> {
    return this.prisma.sundaySchoolLesson.findUnique({
      where: { id },
      include: { course: { include: { profile: { include: withCount } } } },
    });
  }

  /** Saves the lesson and marks its course as just changed. */
  async updateLesson(
    id: string,
    data: Prisma.SundaySchoolLessonUpdateInput,
  ): Promise<SundaySchoolLessonWithCourse> {
    const lesson = await this.prisma.sundaySchoolLesson.update({
      where: { id },
      data,
      include: { course: { include: { profile: { include: withCount } } } },
    });
    await this.prisma.sundaySchoolCourse.update({
      where: { id: lesson.courseId },
      data: { updatedAt: new Date() },
    });
    return lesson;
  }
}
