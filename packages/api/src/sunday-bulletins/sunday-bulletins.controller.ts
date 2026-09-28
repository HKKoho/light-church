// packages/api/src/sunday-bulletins/sunday-bulletins.controller.ts
import { Body, Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  archiveBulletinsSchema,
  importRosterSchema,
  saveSundayBulletinsSchema,
} from '@clawix/shared';
import type {
  ArchiveBulletinsInput,
  ImportRosterInput,
  ImportRosterResult,
  ImportSundayBulletinsResult,
  ResetSundayBulletinsResult,
  SaveSundayBulletinsInput,
  SaveSundayBulletinsResult,
  SundayBulletinList,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SundayBulletinsService } from './sunday-bulletins.service.js';

// Import path is also referenced by main.ts, which raises the body limit for it.
export const SUNDAY_BULLETINS_IMPORT_PATH = '/api/v1/sunday-bulletins/import';
export const SUNDAY_ROSTER_IMPORT_PATH = '/api/v1/sunday-bulletins/roster-import';

// Any signed-in user of the Sunday Service Bulletin tool; the tool's own
// 助理 → 幹事 → 主任牧師／傳道 workflow governs who approves what.
@ApiTags('sunday-bulletins')
@Controller('api/v1/sunday-bulletins')
export class SundayBulletinsController {
  constructor(private readonly service: SundayBulletinsService) {}

  @Get()
  async list(): Promise<{ success: boolean; data: SundayBulletinList }> {
    return { success: true, data: await this.service.list() };
  }

  @Put()
  async save(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(saveSundayBulletinsSchema)) body: SaveSundayBulletinsInput,
  ): Promise<{ success: boolean; data: SaveSundayBulletinsResult }> {
    return { success: true, data: await this.service.save(body, req.user.sub) };
  }

  @Post('import')
  @HttpCode(202)
  async importPdfs(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(archiveBulletinsSchema)) body: ArchiveBulletinsInput,
  ): Promise<{ success: boolean; data: ImportSundayBulletinsResult }> {
    return { success: true, data: await this.service.importPdfs(body, req.user.sub) };
  }

  // Takes about a minute: the AI maps every roster cell onto the bulletin.
  @Post('roster-import')
  @HttpCode(200)
  async importRoster(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(importRosterSchema)) body: ImportRosterInput,
  ): Promise<{ success: boolean; data: ImportRosterResult }> {
    return { success: true, data: await this.service.importRoster(body, req.user.sub) };
  }

  // Archives every active bulletin; used by the tool's Reset button.
  @Post('reset')
  @HttpCode(200)
  async reset(
    @Req() req: { user: JwtPayload },
  ): Promise<{ success: boolean; data: ResetSundayBulletinsResult }> {
    return { success: true, data: await this.service.reset(req.user.sub) };
  }

  @Post(':id/archive')
  @HttpCode(200)
  async archive(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.service.archiveBulletin(id, req.user.sub);
    return { success: true };
  }
}
