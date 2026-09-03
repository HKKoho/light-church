import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  updateCongregationProfileSchema,
  type UpdateCongregationProfileInput,
} from '@clawix/shared';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CongregationProfileService } from './congregation-profile.service.js';

@ApiTags('admin/congregation-profile')
@Controller('admin/congregation-profile')
@Roles(UserRole.super_admin)
export class CongregationProfileController {
  constructor(private readonly service: CongregationProfileService) {}

  // Any authenticated role — not just super_admin — needs to know the church's
  // governance model to render the correct sidebar layout, so this route
  // overrides the controller-level @Roles(super_admin) with an empty role list
  // (RolesGuard treats no required roles as "any authenticated user"). It
  // intentionally exposes only this one field, not the full demographic profile.
  @Get('governance-model')
  @Roles()
  async getGovernanceModel() {
    const { governanceModel } = await this.service.get();
    return { success: true, data: { governanceModel } };
  }

  @Get()
  async get() {
    return { success: true, data: await this.service.get() };
  }

  @Patch()
  async update(
    @Body(new ZodValidationPipe(updateCongregationProfileSchema))
    body: UpdateCongregationProfileInput,
  ) {
    return { success: true, data: await this.service.update(body) };
  }
}
