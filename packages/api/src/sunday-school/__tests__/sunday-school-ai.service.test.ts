// packages/api/src/sunday-school/__tests__/sunday-school-ai.service.test.ts
import { BadGatewayException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { SundaySchoolRepository } from '../../db/sunday-school.repository.js';
import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { SundaySchoolAiService } from '../sunday-school-ai.service.js';
import type { SundaySchoolService } from '../sunday-school.service.js';
import { block, courseRow, leader, lessonWithCourse, profileRow, volunteer } from './fixtures.js';

const SYLLABUS = JSON.stringify({
  courseTitle: 'Jonah: Mercy for All',
  weeks: [1, 2].map((n) => ({
    title: `Week ${n}`,
    passage: `Jonah ${n}`,
    bigIdea: 'Idea',
    learningObjective: 'Objective',
  })),
});
const EXEGESIS = JSON.stringify({ historicalContext: 'Context', theologicalAnchors: ['Mercy'] });
const BLOCKS = JSON.stringify({
  blocks: ['hook', 'book', 'application'].map((type) => ({
    type,
    title: type,
    durationMinutes: 15,
    content: 'c',
    teacherNotes: 't',
  })),
});
const REVIEW = JSON.stringify({
  verseAccuracy: { status: 'verified' },
  ageFit: { status: 'verified' },
  doctrine: { status: 'verified' },
  summary: 'Ready',
});

const draftInput = {
  title: '',
  mode: 'book' as const,
  subject: 'Jonah',
  weeks: 2,
  profileId: 'p1',
  methodology: 'inductive' as const,
  deliveryFormat: 'in_person' as const,
  language: 'en' as const,
};

function makeService(reply: string, lesson = lessonWithCourse()) {
  const llm = { complete: vi.fn(async () => reply) };
  const studio = {
    findProfile: vi.fn(async () => profileRow()),
    findLesson: vi.fn(async () => lesson),
    log: vi.fn(async () => ({})),
  };
  const repo = {
    createCourse: vi.fn(async () => courseRow({ title: 'Jonah: Mercy for All' })),
    updateLesson: vi.fn(async () => lesson),
  };
  const service = new SundaySchoolAiService(
    studio as unknown as SundaySchoolService,
    repo as unknown as SundaySchoolRepository,
    llm as unknown as OneShotLlmService,
  );
  return { service, llm, studio, repo };
}

describe('SundaySchoolAiService.draftCourse', () => {
  it('saves the Dean’s syllabus as an unapproved course of outline lessons', async () => {
    const { service, llm, repo, studio } = makeService(SYLLABUS);
    const course = await service.draftCourse(draftInput, leader);
    expect(llm.complete).toHaveBeenCalledWith(
      expect.objectContaining({ usageTag: 'ai-tool:sunday-school:dean', userId: 'u1' }),
    );
    const data = repo.createCourse.mock.calls[0]?.[0] as unknown as {
      title: string;
      lessons: { create: { weekNumber: number; targetDurationMinutes: number }[] };
    };
    expect(data.title).toBe('Jonah: Mercy for All');
    expect(data.lessons.create.map((l) => l.weekNumber)).toEqual([1, 2]);
    expect(data.lessons.create[0]?.targetDurationMinutes).toBe(45);
    expect(course.syllabusApproved).toBe(false);
    expect(studio.log).toHaveBeenCalledWith(leader, 'course.draft', 'c1', expect.anything());
  });

  it('keeps the teacher’s own title', async () => {
    const { service, repo } = makeService(SYLLABUS);
    await service.draftCourse({ ...draftInput, title: 'Our Jonah' }, leader);
    expect(repo.createCourse.mock.calls[0]?.[0]).toMatchObject({ title: 'Our Jonah' });
  });

  it('refuses non-editors and bad replies', async () => {
    await expect(makeService(SYLLABUS).service.draftCourse(draftInput, volunteer)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(makeService('sorry').service.draftCourse(draftInput, leader)).rejects.toThrow(
      BadGatewayException,
    );
  });
});

describe('SundaySchoolAiService.prepareLesson', () => {
  it('waits for the syllabus to be approved', async () => {
    const { service, llm } = makeService(EXEGESIS, lessonWithCourse({}, false));
    await expect(service.prepareLesson('l1', 'exegete', leader)).rejects.toThrow(/Approve/);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('saves the Exegete’s notes', async () => {
    const { service, repo, studio } = makeService(EXEGESIS);
    await service.prepareLesson('l1', 'exegete', leader);
    expect(repo.updateLesson).toHaveBeenCalledWith('l1', {
      exegesis: expect.objectContaining({ historicalContext: 'Context' }),
    });
    expect(studio.log).toHaveBeenCalledWith(leader, 'lesson.exegete', 'l1', expect.anything());
  });

  it('plans blocks only after the passage study, clearing the old review', async () => {
    await expect(
      makeService(BLOCKS).service.prepareLesson('l1', 'pedagogue', leader),
    ).rejects.toThrow(BadRequestException);

    const { service, repo } = makeService(
      BLOCKS,
      lessonWithCourse({ exegesis: JSON.parse(EXEGESIS) }),
    );
    await service.prepareLesson('l1', 'pedagogue', leader);
    const data = repo.updateLesson.mock.calls[0]?.[1] as unknown as {
      blocks: unknown[];
      status: string;
      review: unknown;
    };
    expect(data.blocks).toHaveLength(3);
    expect(data.status).toBe('generated');
    expect(data.review).toBe(Prisma.DbNull);
  });

  it('reviews only planned lessons', async () => {
    await expect(
      makeService(REVIEW).service.prepareLesson('l1', 'reviewer', leader),
    ).rejects.toThrow(/Plan the lesson/);

    const { service, repo } = makeService(REVIEW, lessonWithCourse({ blocks: [block()] }));
    await service.prepareLesson('l1', 'reviewer', leader);
    expect(repo.updateLesson.mock.calls[0]?.[1]).toMatchObject({ review: { passed: true } });
  });

  it('refuses non-editors', async () => {
    await expect(
      makeService(EXEGESIS).service.prepareLesson('l1', 'exegete', volunteer),
    ).rejects.toThrow(ForbiddenException);
  });
});
