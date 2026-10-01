// packages/api/src/help-assistant/help-assistant.module.ts
import { Module } from '@nestjs/common';

import { EngineModule } from '../engine/engine.module.js';
import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { WorkspaceModule } from '../workspace/index.js';
import { HelpAssistantController } from './help-assistant.controller.js';
import { HelpAssistantService } from './help-assistant.service.js';

@Module({
  imports: [EngineModule, OneShotLlmModule, WorkspaceModule],
  controllers: [HelpAssistantController],
  providers: [HelpAssistantService],
})
export class HelpAssistantModule {}
