// packages/api/src/wisdom/wisdom-courses.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  publishWisdomCourseSchema,
  saveWisdomCourseSchema,
  type PublishWisdomCourseInput,
  type SaveWisdomCourseInput,
  type WisdomAdminCourse,
  type WisdomCourseInfo,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WisdomCoursesService } from './wisdom-courses.service.js';
import type { Actor } from './wisdom.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

/** Staff: Wisdom in Bible and Sunday School courses, and whether each is on the church website. */
@ApiTags('wisdom')
@Controller('api/v1/wisdom/admin/courses')
export class WisdomCoursesAdminController {
  constructor(private readonly courses: WisdomCoursesService) {}

  @Get()
  async list(@Req() req: AuthedRequest): Promise<{ success: boolean; data: WisdomAdminCourse[] }> {
    return { success: true, data: await this.courses.listAdmin(actor(req)) };
  }

  @Get(':id')
  async get(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: WisdomCourseInfo }> {
    return { success: true, data: await this.courses.get(id, actor(req)) };
  }

  @Post()
  async create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveWisdomCourseSchema)) body: SaveWisdomCourseInput,
  ): Promise<{ success: boolean; data: WisdomCourseInfo }> {
    return { success: true, data: await this.courses.create(body, actor(req)) };
  }

  @Put(':id')
  async update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveWisdomCourseSchema)) body: SaveWisdomCourseInput,
  ): Promise<{ success: boolean; data: WisdomCourseInfo }> {
    return { success: true, data: await this.courses.update(id, body, actor(req)) };
  }

  @Put(':id/publish')
  async publish(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(publishWisdomCourseSchema)) body: PublishWisdomCourseInput,
  ): Promise<{ success: boolean; data: WisdomCourseInfo }> {
    return { success: true, data: await this.courses.publish(id, body, actor(req)) };
  }

  @Delete(':id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<{ success: boolean }> {
    await this.courses.remove(id, actor(req));
    return { success: true };
  }
}

/** Anyone: the courses published on the church website. */
@ApiTags('public-site')
@Controller('api/v1/public/courses')
export class WisdomCoursesPublicController {
  constructor(private readonly courses: WisdomCoursesService) {}

  @Public()
  @Get()
  async list(): Promise<{ success: boolean; data: WisdomCourseInfo[] }> {
    return { success: true, data: await this.courses.listPublished() };
  }
}
