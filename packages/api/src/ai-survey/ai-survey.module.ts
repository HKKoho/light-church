import { Module } from '@nestjs/common';

import { ConnectorsModule } from '../connectors/connectors.module.js';
import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { AiSurveyController } from './ai-survey.controller.js';
import { AiSurveyService } from './ai-survey.service.js';

@Module({
  imports: [ConnectorsModule, OneShotLlmModule],
  controllers: [AiSurveyController],
  providers: [AiSurveyService],
})
export class AiSurveyModule {}
