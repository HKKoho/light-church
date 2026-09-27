import { Module } from '@nestjs/common';

import { WisdomAdminController } from './wisdom-admin.controller.js';
import { WisdomMembersController } from './wisdom-members.controller.js';
import { WisdomService } from './wisdom.service.js';

@Module({
  controllers: [WisdomAdminController, WisdomMembersController],
  providers: [WisdomService],
})
export class WisdomModule {}
