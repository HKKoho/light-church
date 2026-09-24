import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateConnectorsSchema } from '@clawix/shared';
import type { ConnectorStatus, UpdateConnectorsInput } from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { Roles } from '../auth/roles.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuditLogRepository } from '../db/audit-log.repository.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ConnectorSettingsService } from './connector-settings.service.js';

@ApiTags('connectors')
@Controller('api/v1/connectors')
@Roles(UserRole.super_admin)
export class ConnectorsController {
  constructor(
    private readonly service: ConnectorSettingsService,
    private readonly audit: AuditLogRepository,
  ) {}

  @Get()
  async status(): Promise<{ success: boolean; data: ConnectorStatus }> {
    return { success: true, data: await this.service.status() };
  }

  @Put()
  async update(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(updateConnectorsSchema)) body: UpdateConnectorsInput,
  ): Promise<{ success: boolean; data: ConnectorStatus }> {
    const data = await this.service.update(body);
    await this.audit.create({
      userId: req.user.sub,
      action: 'connectors.update',
      resource: 'connectors',
      resourceId: 'default',
      // Which fields changed — never the secrets themselves.
      details: { fields: Object.keys(body) },
    });
    return { success: true, data };
  }
}
