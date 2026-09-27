// packages/api/src/wisdom/wisdom-admin.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  saveWisdomCycleSchema,
  saveWisdomModuleSchema,
  type SaveWisdomCycleInput,
  type SaveWisdomModuleData,
  type WisdomAdminCycle,
  type WisdomCycleInfo,
  type WisdomModuleDetail,
} from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { WisdomService, type Actor } from './wisdom.service.js';

interface AuthedRequest {
  user: JwtPayload;
}
const actor = (req: AuthedRequest): Actor => ({ id: req.user.sub, role: req.user.role });

/** Staff: edit the Wisdom in Bible course. */
@ApiTags('wisdom')
@Controller('api/v1/wisdom/admin')
export class WisdomAdminController {
  constructor(private readonly wisdom: WisdomService) {}

  @Get('cycles')
  async list(@Req() req: AuthedRequest): Promise<{ success: boolean; data: WisdomAdminCycle[] }> {
    return { success: true, data: await this.wisdom.listAdmin(actor(req)) };
  }

  @Post('cycles')
  async createCycle(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveWisdomCycleSchema)) body: SaveWisdomCycleInput,
  ): Promise<{ success: boolean; data: WisdomCycleInfo }> {
    return { success: true, data: await this.wisdom.createCycle(body, actor(req)) };
  }

  @Put('cycles/:id')
  async updateCycle(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveWisdomCycleSchema)) body: SaveWisdomCycleInput,
  ): Promise<{ success: boolean; data: WisdomCycleInfo }> {
    return { success: true, data: await this.wisdom.updateCycle(id, body, actor(req)) };
  }

  @Delete('cycles/:id')
  async deleteCycle(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.wisdom.deleteCycle(id, actor(req));
    return { success: true };
  }

  @Get('modules/:id')
  async getModule(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: WisdomModuleDetail }> {
    return { success: true, data: await this.wisdom.getModule(id, actor(req)) };
  }

  @Post('modules')
  async createModule(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(saveWisdomModuleSchema)) body: SaveWisdomModuleData,
  ): Promise<{ success: boolean; data: WisdomModuleDetail }> {
    return { success: true, data: await this.wisdom.createModule(body, actor(req)) };
  }

  @Put('modules/:id')
  async updateModule(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(saveWisdomModuleSchema)) body: SaveWisdomModuleData,
  ): Promise<{ success: boolean; data: WisdomModuleDetail }> {
    return { success: true, data: await this.wisdom.updateModule(id, body, actor(req)) };
  }

  @Delete('modules/:id')
  async deleteModule(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.wisdom.deleteModule(id, actor(req));
    return { success: true };
  }
}
