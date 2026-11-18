// packages/api/src/sunday-school/sunday-school-ai.service.ts
//
// The Studio's AI roles, ported from LogosCraft (DevBibleCourse) onto the
// church's default provider through OneShotLlmService, so usage is
// accounted for. The Dean drafts a syllabus; each lesson is then prepared
// one step per request — Exegete, Pedagogue, Reviewer — so the page can show
// progress and no request runs long. Only the class profile and lesson text
// are sent, never member data.
import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  GenerateSundaySchoolSyllabusData,
  SsGenerationStage,
  SundaySchoolCourseDetail,
  SundaySchoolLessonDetail,
} from '@clawix/shared';

import type { SundaySchoolLessonWithCourse } from '../db/sunday-school.repository.js';
import { SundaySchoolRepository } from '../db/sunday-school.repository.js';
import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  readBlocks,
  readExegesis,
  toCourseDetail,
  toLessonDetail,
  toProfileData,
} from './sunday-school.mappers.js';
import { parseBlocks, parseExegesis, parseReview, parseSyllabus } from './sunday-school.parsers.js';
import {
  DEAN_SYSTEM,
  EXEGETE_SYSTEM,
  PEDAGOGUE_SYSTEM,
  REVIEWER_SYSTEM,
  buildBlocksPrompt,
  buildExegesisPrompt,
  buildReviewPrompt,
  buildSyllabusPrompt,
  type LessonBrief,
} from './sunday-school.prompts.js';
import { assertEditor, SundaySchoolService, type Actor } from './sunday-school.service.js';

const usageTag = (role: string) => `ai-tool:sunday-school:${role}`;

/** Medium participation until the teacher changes it. */
const DEFAULT_PARTICIPATION = 3;

@Injectable()
export class SundaySchoolAiService {
  constructor(
    private readonly studio: SundaySchoolService,
    private readonly repo: SundaySchoolRepository,
    private readonly llm: OneShotLlmService,
  ) {}

  /** The Dean drafts a syllabus; it is saved as an unapproved course with outline lessons. */
  async draftCourse(
    input: GenerateSundaySchoolSyllabusData,
    actor: Actor,
  ): Promise<SundaySchoolCourseDetail> {
    assertEditor(actor);
    const profileRow = await this.studio.findProfile(input.profileId);
    const profile = toProfileData(profileRow);
    const reply = await this.llm.complete({
      system: DEAN_SYSTEM,
      prompt: buildSyllabusPrompt(input, profile),
      userId: actor.id,
      usageTag: usageTag('dean'),
      temperature: 0.5,
    });
    const draft = parseSyllabus(reply, input.weeks);
    const row = await this.repo.createCourse({
      title: input.title || draft.courseTitle,
      mode: input.mode,
      subject: input.subject,
      language: input.language,
      methodology: input.methodology,
      deliveryFormat: input.deliveryFormat,
      createdById: actor.id,
      profile: { connect: { id: profileRow.id } },
      lessons: {
        create: draft.weeks.map((week, i) => ({
          ...week,
          weekNumber: i + 1,
          methodology: input.methodology,
          participationLevel: DEFAULT_PARTICIPATION,
          deliveryFormat: input.deliveryFormat,
          targetDurationMinutes: profile.defaultDurationMinutes,
        })),
      },
    });
    await this.studio.log(actor, 'course.draft', row.id, {
      title: row.title,
      weeks: draft.weeks.length,
    });
    return toCourseDetail(row);
  }

  /** Runs one preparation step on a lesson and saves what it produced. */
  async prepareLesson(
    id: string,
    stage: SsGenerationStage,
    actor: Actor,
  ): Promise<SundaySchoolLessonDetail> {
    assertEditor(actor);
    const row = await this.studio.findLesson(id);
    if (!row.course.syllabusApproved) {
      throw new BadRequestException('Approve the syllabus before preparing lessons');
    }
    const data = await this.runStage(row, stage, actor);
    const saved = await this.repo.updateLesson(id, data);
    await this.studio.log(actor, `lesson.${stage}`, id, { title: saved.title });
    return toLessonDetail(saved);
  }

  private async runStage(
    row: SundaySchoolLessonWithCourse,
    stage: SsGenerationStage,
    actor: Actor,
  ): Promise<Prisma.SundaySchoolLessonUpdateInput> {
    const profile = toProfileData(row.course.profile);
    const brief = toBrief(row);
    const ask = (system: string, prompt: string, temperature: number) =>
      this.llm.complete({
        system,
        prompt,
        userId: actor.id,
        usageTag: usageTag(stage),
        temperature,
      });

    if (stage === 'exegete') {
      const reply = await ask(EXEGETE_SYSTEM, buildExegesisPrompt(brief, profile), 0.3);
      return { exegesis: parseExegesis(reply) };
    }

    if (stage === 'pedagogue') {
      const exegesis = readExegesis(row.exegesis);
      if (!exegesis) throw new BadRequestException('Study the passage first');
      const reply = await ask(PEDAGOGUE_SYSTEM, buildBlocksPrompt(brief, profile, exegesis), 0.6);
      // New blocks need a fresh review, and approval again.
      return {
        blocks: parseBlocks(reply, brief.targetDurationMinutes),
        status: 'generated',
        review: Prisma.DbNull,
      };
    }

    const blocks = readBlocks(row.blocks);
    if (blocks.length === 0) throw new BadRequestException('Plan the lesson blocks first');
    const reply = await ask(REVIEWER_SYSTEM, buildReviewPrompt(brief, profile, blocks), 0.2);
    return { review: parseReview(reply, blocks, brief.targetDurationMinutes) };
  }
}

function toBrief(row: SundaySchoolLessonWithCourse): LessonBrief {
  return {
    title: row.title,
    passage: row.passage,
    bigIdea: row.bigIdea,
    learningObjective: row.learningObjective,
    methodology: row.methodology as LessonBrief['methodology'],
    participationLevel: row.participationLevel,
    deliveryFormat: row.deliveryFormat as LessonBrief['deliveryFormat'],
    targetDurationMinutes: row.targetDurationMinutes,
    language: row.course.language as LessonBrief['language'],
  };
}
