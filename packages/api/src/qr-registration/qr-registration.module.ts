import { Module } from '@nestjs/common';

import { ConnectorsModule } from '../connectors/connectors.module.js';
import { QrRegistrationController } from './qr-registration.controller.js';
import { QrRegistrationService } from './qr-registration.service.js';

@Module({
  imports: [ConnectorsModule],
  controllers: [QrRegistrationController],
  providers: [QrRegistrationService],
})
export class QrRegistrationModule {}
