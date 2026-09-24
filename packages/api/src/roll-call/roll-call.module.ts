// packages/api/src/roll-call/roll-call.module.ts
import { Module } from '@nestjs/common';
import { LocalLlmService } from '../engine/local-llm/local-llm.service.js';
import { RollCallAiService } from './roll-call-ai.service.js';
import { RollCallSimpleService } from './roll-call-simple.service.js';
import { RollCallController } from './roll-call.controller.js';
import { RollCallService } from './roll-call.service.js';

@Module({
  controllers: [RollCallController],
  providers: [RollCallService, RollCallAiService, RollCallSimpleService, LocalLlmService],
})
export class RollCallModule {}
