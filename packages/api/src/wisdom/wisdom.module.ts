import { Module } from '@nestjs/common';

import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { WisdomAdminController } from './wisdom-admin.controller.js';
import {
  WisdomCoursesAdminController,
  WisdomCoursesPublicController,
} from './wisdom-courses.controller.js';
import { WisdomCoursesService } from './wisdom-courses.service.js';
import { WisdomMembersController } from './wisdom-members.controller.js';
import { WisdomMichaelService } from './wisdom-michael.service.js';
import { WisdomService } from './wisdom.service.js';

@Module({
  imports: [OneShotLlmModule],
  controllers: [
    WisdomCoursesAdminController,
    WisdomCoursesPublicController,
    WisdomAdminController,
    WisdomMembersController,
  ],
  providers: [WisdomService, WisdomCoursesService, WisdomMichaelService],
})
export class WisdomModule {}
