import { Module } from '@nestjs/common';

import { WisdomAdminController } from './wisdom-admin.controller.js';
import {
  WisdomCoursesAdminController,
  WisdomCoursesPublicController,
} from './wisdom-courses.controller.js';
import { WisdomCoursesService } from './wisdom-courses.service.js';
import { WisdomMembersController } from './wisdom-members.controller.js';
import { WisdomService } from './wisdom.service.js';

@Module({
  controllers: [
    WisdomCoursesAdminController,
    WisdomCoursesPublicController,
    WisdomAdminController,
    WisdomMembersController,
  ],
  providers: [WisdomService, WisdomCoursesService],
})
export class WisdomModule {}
