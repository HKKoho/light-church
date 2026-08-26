import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { paginationSchema } from '@clawix/shared';
import type { PaginationInput } from '@clawix/shared';

import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ClientRunsService } from './client-runs.service.js';

@ApiTags('client')
@Controller('api/v1/client/runs')
@Roles(UserRole.client)
export class ClientRunsController {
  constructor(private readonly clientRunsService: ClientRunsService) {}

  @Get()
  listRuns(
    @Req() req: { user: JwtPayload },
    @Query(new ZodValidationPipe(paginationSchema)) query: PaginationInput,
  ) {
    return this.clientRunsService.listMyRuns(req.user.sub, query);
  }

  @Get(':id/download')
  async download(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { filename, content } = await this.clientRunsService.downloadRun(req.user.sub, id);
    reply.header('Content-Type', 'text/markdown; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    await reply.send(content);
  }
}
