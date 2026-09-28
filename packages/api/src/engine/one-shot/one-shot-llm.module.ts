import { Module } from '@nestjs/common';

import { ProviderConfigModule } from '../../provider-config/provider-config.module.js';
import { TokenCounterService } from '../token-counter.service.js';
import { OneShotImageService } from './one-shot-image.service.js';
import { OneShotLlmService } from './one-shot-llm.service.js';

@Module({
  imports: [ProviderConfigModule],
  providers: [OneShotLlmService, OneShotImageService, TokenCounterService],
  exports: [OneShotLlmService, OneShotImageService],
})
export class OneShotLlmModule {}
