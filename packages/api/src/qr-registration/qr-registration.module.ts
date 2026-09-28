import { Module } from '@nestjs/common';

import { ConnectorsModule } from '../connectors/connectors.module.js';
import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { QrRegistrationController } from './qr-registration.controller.js';
import { QrRegistrationService } from './qr-registration.service.js';

@Module({
  imports: [ConnectorsModule, OneShotLlmModule],
  controllers: [QrRegistrationController],
  providers: [QrRegistrationService],
})
export class QrRegistrationModule {}
