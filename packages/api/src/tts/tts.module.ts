import { Module } from '@nestjs/common';
import { PiperTtsService } from './tts.service.js';

@Module({
  providers: [PiperTtsService],
  exports: [PiperTtsService],
})
export class TtsModule {}
