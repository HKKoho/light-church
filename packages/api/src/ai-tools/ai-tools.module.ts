// packages/api/src/ai-tools/ai-tools.module.ts
import { Module } from '@nestjs/common';
import { AiToolsController } from './ai-tools.controller.js';
import { AiToolsService } from './ai-tools.service.js';

@Module({
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}
