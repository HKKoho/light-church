import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { packToggleSchema } from '@clawix/shared';
import type { PackToggleInput } from '@clawix/shared';

import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PacksService } from './packs.service.js';

@ApiTags('admin/packs')
@Controller('admin/packs')
@Roles(UserRole.super_admin)
export class PacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get()
  list() {
    return this.packsService.list();
  }

  @Post(':packId/install')
  install(@Param('packId') packId: string) {
    return this.packsService.install(packId);
  }

  @Patch(':packId')
  setEnabled(
    @Param('packId') packId: string,
    @Body(new ZodValidationPipe(packToggleSchema)) body: PackToggleInput,
  ) {
    return this.packsService.setEnabled(packId, body.enabled);
  }
}
