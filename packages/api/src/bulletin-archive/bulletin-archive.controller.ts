// packages/api/src/bulletin-archive/bulletin-archive.controller.ts
import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { archiveBulletinsSchema } from '@clawix/shared';
import type {
  ArchiveBulletinsInput,
  ArchiveBulletinsResult,
  BulletinArchiveEntry,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Roles } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UserRole } from '../generated/prisma/enums.js';
import { BulletinArchiveService } from './bulletin-archive.service.js';

// Route path is also referenced by main.ts, which raises the body limit for it.
export const BULLETIN_ARCHIVE_PATH = '/api/v1/bulletin-archive';

@ApiTags('bulletin-archive')
@Controller('api/v1/bulletin-archive')
export class BulletinArchiveController {
  constructor(private readonly service: BulletinArchiveService) {}

  // Any signed-in user of the Sunday Service Bulletin tool may archive.
  @Post()
  async archive(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(archiveBulletinsSchema)) body: ArchiveBulletinsInput,
  ): Promise<{ success: boolean; data: ArchiveBulletinsResult }> {
    return { success: true, data: await this.service.archive(body, req.user.sub) };
  }

  // Metadata only, for staff — the archive is not part of the bulletin editor.
  @Get()
  @Roles(UserRole.super_admin, UserRole.senior_pastor, UserRole.pastor, UserRole.admin_staff)
  async list(
    @Query('churchName') churchName?: string,
  ): Promise<{ success: boolean; data: BulletinArchiveEntry[] }> {
    return { success: true, data: await this.service.list(churchName) };
  }
}
