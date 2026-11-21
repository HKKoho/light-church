// packages/api/src/theology-library/theology-library.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  reviewReadingSourceSchema,
  theologyAskSchema,
  theologySearchSchema,
  uploadReadingSourceSchema,
  type ReadingSourceDetail,
  type ReadingSourceSummary,
  type ReviewReadingSourceData,
  type TheologyAnswer,
  type TheologyAskData,
  type TheologyPassage,
  type TheologySearchData,
  type UploadReadingSourceData,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { TheologyAssistantService } from './assistant.service.js';
import { TheologySearchService } from './search.service.js';
import { TheologyLibraryService, assertReader, type Actor } from './theology-library.service.js';

export const THEOLOGY_LIBRARY_PATH = '/api/v1/theology-library';
/** Upload route — its body limit is raised in main.ts (base64 of a 20 MB file). */
export const THEOLOGY_UPLOAD_PATH = `${THEOLOGY_LIBRARY_PATH}/sources`;

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

type Ok<T> = Promise<{ success: boolean; data: T }>;

/** Theology Platform: the curated library, search and the Theology Assistant. */
@ApiTags('theology-library')
@Controller('api/v1/theology-library')
export class TheologyLibraryController {
  constructor(
    private readonly library: TheologyLibraryService,
    private readonly searchService: TheologySearchService,
    private readonly assistant: TheologyAssistantService,
  ) {}

  @Get('sources')
  async list(@Req() req: AuthedRequest): Ok<ReadingSourceSummary[]> {
    return { success: true, data: await this.library.list(actor(req)) };
  }

  @Get('sources/:id')
  async detail(@Req() req: AuthedRequest, @Param('id') id: string): Ok<ReadingSourceDetail> {
    return { success: true, data: await this.library.detail(id, actor(req)) };
  }

  @Post('sources')
  async upload(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(uploadReadingSourceSchema)) body: UploadReadingSourceData,
  ): Ok<ReadingSourceSummary> {
    return { success: true, data: await this.library.upload(body, actor(req)) };
  }

  @Post('sources/:id/review')
  async review(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewReadingSourceSchema)) body: ReviewReadingSourceData,
  ): Ok<ReadingSourceSummary> {
    return { success: true, data: await this.library.review(id, body, actor(req)) };
  }

  @Post('sources/:id/reprocess')
  async reprocess(@Req() req: AuthedRequest, @Param('id') id: string): Ok<ReadingSourceSummary> {
    return { success: true, data: await this.library.reprocess(id, actor(req)) };
  }

  @Delete('sources/:id')
  async remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.library.remove(id, actor(req));
    return { success: true };
  }

  @Post('search')
  async search(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(theologySearchSchema)) body: TheologySearchData,
  ): Ok<TheologyPassage[]> {
    assertReader(actor(req));
    const data = await this.searchService.search({
      ...body,
      userId: req.user.sub,
      usageTag: 'theology-library:search',
    });
    return { success: true, data };
  }

  @Post('ask')
  async ask(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(theologyAskSchema)) body: TheologyAskData,
  ): Ok<TheologyAnswer> {
    assertReader(actor(req));
    return { success: true, data: await this.assistant.ask(body, req.user.sub) };
  }
}
