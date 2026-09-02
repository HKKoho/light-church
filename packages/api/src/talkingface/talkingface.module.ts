import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EngineModule } from '../engine/engine.module.js';
import { TtsModule } from '../tts/tts.module.js';
import { TalkingFaceController } from './talkingface.controller.js';
import { TalkingFaceGateway } from './talkingface.gateway.js';

@Module({
  imports: [EngineModule, TtsModule, JwtModule.register({})],
  controllers: [TalkingFaceController],
  providers: [TalkingFaceGateway],
})
export class TalkingFaceModule {}
