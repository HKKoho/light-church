// packages/api/src/sunday-school/sunday-school.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  generateSundaySchoolLessonSchema,
  generateSundaySchoolSyllabusSchema,
  saveSundaySchoolLessonSchema,
  saveSundaySchoolProfileSchema,
  sundaySchoolSyllabusWeekSchema,
  updateSundaySchoolCourseSchema,
  type GenerateSundaySchoolLessonInput,
  type GenerateSundaySchoolSyllabusData,
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

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SundaySchoolAiService } from './sunday-school-ai.service.js';
import { SundaySchoolService, type Actor } from './sunday-school.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

type Ok<T> = Promise<{ success: boolean; data: T }>;

/** Staff: Sunday School Studio — class profiles, AI-drafted courses and lessons. */
@ApiTags('sunday-school')
@Controller('api/v1/sunday-school')
export class SundaySchoolController {
  constructor(
    private readonly studio: SundaySchoolService,
    private readonly ai: SundaySchoolAiService,
  ) {}

  @Get('profiles')
  async listProfiles(@Req() req: AuthedRequest): Ok<SundaySchoolProfileInfo[]> {
    return { success: true, data: await this.studio.listProfiles(actor(req)) };
  }

  @Post('profiles')
  async createProfile(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveSundaySchoolProfileSchema)) body: SaveSundaySchoolProfileData,
  ): Ok<SundaySchoolProfileInfo> {
    return { success: true, data: await this.studio.createProfile(body, actor(req)) };
  }

  @Put('profiles/:id')
  async updateProfile(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveSundaySchoolProfileSchema)) body: SaveSundaySchoolProfileData,
  ): Ok<SundaySchoolProfileInfo> {
    return { success: true, data: await this.studio.updateProfile(id, body, actor(req)) };
  }

  @Delete('profiles/:id')
  async removeProfile(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.studio.removeProfile(id, actor(req));
    return { success: true };
  }

  @Get('courses')
  async listCourses(@Req() req: AuthedRequest): Ok<SundaySchoolCourseSummary[]> {
    return { success: true, data: await this.studio.listCourses(actor(req)) };
  }

  /** The Dean drafts a syllabus, saved as a new unapproved course. */
  @Post('courses/draft')
  async draftCourse(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(generateSundaySchoolSyllabusSchema))
    body: GenerateSundaySchoolSyllabusData,
  ): Ok<SundaySchoolCourseDetail> {
    return { success: true, data: await this.ai.draftCourse(body, actor(req)) };
  }

  @Get('courses/:id')
  async getCourse(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Ok<SundaySchoolCourseDetail> {
    return { success: true, data: await this.studio.getCourse(id, actor(req)) };
  }

  @Put('courses/:id')
  async updateCourse(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSundaySchoolCourseSchema))
    body: UpdateSundaySchoolCourseInput,
  ): Ok<SundaySchoolCourseDetail> {
    return { success: true, data: await this.studio.updateCourse(id, body, actor(req)) };
  }

  @Delete('courses/:id')
  async removeCourse(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.studio.removeCourse(id, actor(req));
    return { success: true };
  }

  @Get('lessons/:id')
  async getLesson(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Ok<SundaySchoolLessonDetail> {
    return { success: true, data: await this.studio.getLesson(id, actor(req)) };
  }

  @Put('lessons/:id')
  async updateLesson(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveSundaySchoolLessonSchema)) body: SaveSundaySchoolLessonData,
  ): Ok<SundaySchoolLessonDetail> {
    return { success: true, data: await this.studio.updateLesson(id, body, actor(req)) };
  }

  @Put('lessons/:id/outline')
  async updateOutline(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sundaySchoolSyllabusWeekSchema)) body: SundaySchoolSyllabusWeek,
  ): Ok<SundaySchoolLessonSummary> {
    return { success: true, data: await this.studio.updateOutline(id, body, actor(req)) };
  }

  /** One AI step: exegete (passage notes), pedagogue (blocks) or reviewer (checks). */
  @Post('lessons/:id/prepare')
  async prepareLesson(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(generateSundaySchoolLessonSchema))
    body: GenerateSundaySchoolLessonInput,
  ): Ok<SundaySchoolLessonDetail> {
    return { success: true, data: await this.ai.prepareLesson(id, body.stage, actor(req)) };
  }
}
