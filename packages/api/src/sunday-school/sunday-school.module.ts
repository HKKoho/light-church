import { Module } from '@nestjs/common';

import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { SundaySchoolAiService } from './sunday-school-ai.service.js';
import { SundaySchoolController } from './sunday-school.controller.js';
import { SundaySchoolService } from './sunday-school.service.js';

@Module({
  imports: [OneShotLlmModule],
  controllers: [SundaySchoolController],
  providers: [SundaySchoolService, SundaySchoolAiService],
})
export class SundaySchoolModule {}
