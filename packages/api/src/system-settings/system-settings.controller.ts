import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { updateSystemSettingsSchema } from '@clawix/shared';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { SystemSettingsService } from './system-settings.service.js';

@ApiTags('system-settings')
@Controller('api/v1/system-settings')
// Cron token budgets, timeouts and the default timezone are system-wide.
@Roles(UserRole.super_admin)
export class SystemSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Get()
  async get() {
    return { success: true, data: await this.service.get() };
  }

  @Patch()
  async update(@Body() body: unknown) {
    const data = updateSystemSettingsSchema.parse(body);
    return { success: true, data: await this.service.update(data) };
  }
}
