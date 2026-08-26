import { Module } from '@nestjs/common';
import { ClientRunsController } from './client-runs.controller.js';
import { ClientRunsService } from './client-runs.service.js';

@Module({
  controllers: [ClientRunsController],
  providers: [ClientRunsService],
})
export class ClientModule {}
