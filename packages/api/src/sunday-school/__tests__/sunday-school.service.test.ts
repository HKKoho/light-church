// packages/api/src/sunday-school/__tests__/sunday-school.service.test.ts
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { SundaySchoolRepository } from '../../db/sunday-school.repository.js';
import { SundaySchoolService } from '../sunday-school.service.js';
import {
  block,
  courseRow,
  leader,
  lessonRow,
  lessonWithCourse,
  profileData,
  profileRow,
  volunteer,
} from './fixtures.js';

const lessonInput = {
  title: 'Running from God',
  passage: 'Jonah 1',
  bigIdea: 'God pursues',
  learningObjective: 'Name a way we run',
  methodology: 'inductive' as const,
  participationLevel: 3,
  deliveryFormat: 'in_person' as const,
  targetDurationMinutes: 45,
  blocks: [],
  status: 'outline' as const,
};

function makeService() {
  const repo = {
    listProfiles: vi.fn(async () => [profileRow()]),
    findProfile: vi.fn(async (): Promise<ReturnType<typeof profileRow> | null> => profileRow()),
    createProfile: vi.fn(async () => profileRow()),
    updateProfile: vi.fn(async () => profileRow()),
    deleteProfile: vi.fn(async () => profileRow()),
    listCourses: vi.fn(async () => [courseRow()]),
    findCourse: vi.fn(async (): Promise<ReturnType<typeof courseRow> | null> => courseRow()),
    updateCourse: vi.fn(async () => courseRow({ syllabusApproved: true })),
    deleteCourse: vi.fn(async () => courseRow()),
    findLesson: vi.fn(
      async (): Promise<ReturnType<typeof lessonWithCourse> | null> => lessonWithCourse(),
    ),
    updateLesson: vi.fn(async () => lessonWithCourse({ status: 'approved' })),
  };
  const audit = { create: vi.fn(async () => ({})) };
  const service = new SundaySchoolService(
    repo as unknown as SundaySchoolRepository,
    audit as unknown as AuditLogRepository,
  );
  return { service, repo, audit };
}

describe('SundaySchoolService', () => {
  it('lets only editors in', async () => {
    const { service } = makeService();
    await expect(service.listProfiles(volunteer)).rejects.toThrow(ForbiddenException);
    await expect(service.listCourses(volunteer)).rejects.toThrow(ForbiddenException);
    await expect(service.getLesson('l1', volunteer)).rejects.toThrow(ForbiddenException);
  });

  describe('profiles', () => {
    it('lists, creates and updates with an audit entry', async () => {
      const { service, audit } = makeService();
      expect((await service.listProfiles(leader))[0]).toMatchObject({ id: 'p1', courseCount: 0 });
      await service.createProfile(profileData, leader);
      await service.updateProfile('p1', profileData, leader);
      expect(audit.create.mock.calls.map(([e]) => (e as { action: string }).action)).toEqual([
        'sunday-school.profile.create',
        'sunday-school.profile.update',
      ]);
    });

    it('404s an unknown profile', async () => {
      const { service, repo } = makeService();
      repo.findProfile.mockResolvedValueOnce(null);
      await expect(service.updateProfile('x', profileData, leader)).rejects.toThrow(/not found/);
    });

    it('refuses to delete a profile that courses use', async () => {
      const { service, repo } = makeService();
      repo.findProfile.mockResolvedValueOnce(profileRow(2));
      await expect(service.removeProfile('p1', leader)).rejects.toThrow(ConflictException);
      await service.removeProfile('p1', leader);
      expect(repo.deleteProfile).toHaveBeenCalledWith('p1');
    });
  });

  describe('courses', () => {
    it('summarises lesson progress', async () => {
      const { service, repo } = makeService();
      repo.listCourses.mockResolvedValueOnce([
        courseRow({
          lessons: [
            lessonRow(),
            lessonRow({ id: 'l2', status: 'generated' }),
            lessonRow({ id: 'l3', status: 'approved' }),
          ],
        }),
      ]);
      const [course] = await service.listCourses(leader);
      expect(course).toMatchObject({ lessonCount: 3, generatedCount: 2, approvedCount: 1 });
    });

    it('returns detail and 404s unknown courses', async () => {
      const { service, repo } = makeService();
      expect((await service.getCourse('c1', leader)).lessons[0]).toMatchObject({
        weekNumber: 1,
        reviewPassed: null,
      });
      repo.findCourse.mockResolvedValueOnce(null);
      await expect(service.getCourse('x', leader)).rejects.toThrow(/not found/);
    });

    it('audits approving and reopening the syllabus, not renames', async () => {
      const { service, repo, audit } = makeService();
      await service.updateCourse('c1', { title: 'Jonah', syllabusApproved: true }, leader);
      repo.findCourse.mockResolvedValueOnce(courseRow({ syllabusApproved: true }));
      await service.updateCourse('c1', { title: 'Jonah', syllabusApproved: false }, leader);
      await service.updateCourse('c1', { title: 'Renamed', syllabusApproved: false }, leader);
      expect(audit.create.mock.calls.map(([e]) => (e as { action: string }).action)).toEqual([
        'sunday-school.syllabus.approve',
        'sunday-school.syllabus.reopen',
      ]);
    });

    it('deletes a course', async () => {
      const { service, repo } = makeService();
      await service.removeCourse('c1', leader);
      expect(repo.deleteCourse).toHaveBeenCalledWith('c1');
    });
  });

  describe('lessons', () => {
    it('returns detail and 404s unknown lessons', async () => {
      const { service, repo } = makeService();
      expect(await service.getLesson('l1', leader)).toMatchObject({
        courseTitle: 'Jonah',
        syllabusApproved: true,
        exegesis: null,
      });
      repo.findLesson.mockResolvedValueOnce(null);
      await expect(service.getLesson('x', leader)).rejects.toThrow(/not found/);
    });

    it('will not approve a lesson with no blocks', async () => {
      const { service } = makeService();
      await expect(
        service.updateLesson('l1', { ...lessonInput, status: 'approved' }, leader),
      ).rejects.toThrow(BadRequestException);
    });

    it('audits status changes only', async () => {
      const { service, repo, audit } = makeService();
      const blocks = [block()] as never;
      await service.updateLesson('l1', { ...lessonInput, blocks, status: 'approved' }, leader);
      expect(repo.updateLesson).toHaveBeenCalled();
      await service.updateLesson('l1', lessonInput, leader);
      expect(audit.create).toHaveBeenCalledTimes(1);
      expect(audit.create.mock.calls[0]?.[0]).toMatchObject({
        action: 'sunday-school.lesson.approved',
      });
    });
  });

  it('edits one week of the syllabus', async () => {
    const { service, repo } = makeService();
    const week = { title: 'New', passage: 'Jonah 2', bigIdea: 'b', learningObjective: 'o' };
    expect(await service.updateOutline('l1', week, leader)).toMatchObject({ id: 'l1' });
    expect(repo.updateLesson).toHaveBeenCalledWith('l1', week);
    await expect(service.updateOutline('l1', week, volunteer)).rejects.toThrow(ForbiddenException);
  });
});
