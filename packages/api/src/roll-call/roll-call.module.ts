// packages/api/src/roll-call/roll-call.module.ts
import { Module } from '@nestjs/common';
import { LocalLlmService } from '../engine/local-llm/local-llm.service.js';
import { RollCallAiService } from './roll-call-ai.service.js';
import { RollCallCareController } from './roll-call-care.controller.js';
import { RollCallCareService } from './roll-call-care.service.js';
import { RollCallKioskService } from './roll-call-kiosk.service.js';
import { RollCallSimpleService } from './roll-call-simple.service.js';
import { RollCallController } from './roll-call.controller.js';
import { RollCallService } from './roll-call.service.js';

@Module({
  controllers: [RollCallController, RollCallCareController],
  providers: [
    RollCallService,
    RollCallAiService,
    RollCallSimpleService,
    RollCallKioskService,
    RollCallCareService,
    LocalLlmService,
  ],
})
export class RollCallModule {}
