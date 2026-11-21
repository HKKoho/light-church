import { Module } from '@nestjs/common';

import { ProviderConfigModule } from '../../provider-config/provider-config.module.js';
import { TokenCounterService } from '../token-counter.service.js';
import { EmbeddingService } from './embedding.service.js';

@Module({
  imports: [ProviderConfigModule],
  providers: [EmbeddingService, TokenCounterService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
