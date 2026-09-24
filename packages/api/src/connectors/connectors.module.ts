import { Module } from '@nestjs/common';

import { ConnectorSettingsService } from './connector-settings.service.js';
import { ConnectorsController } from './connectors.controller.js';

@Module({
  controllers: [ConnectorsController],
  providers: [ConnectorSettingsService],
  exports: [ConnectorSettingsService],
})
export class ConnectorsModule {}
