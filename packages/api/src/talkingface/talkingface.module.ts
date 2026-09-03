import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EngineModule } from '../engine/engine.module.js';
import { TtsModule } from '../tts/tts.module.js';
import { SadTalkerService } from './sadtalker.service.js';
import { TalkingFaceAvatarController } from './talkingface-avatar.controller.js';
import { TalkingFaceController } from './talkingface.controller.js';
import { TalkingFaceGateway } from './talkingface.gateway.js';

@Module({
  imports: [EngineModule, TtsModule, JwtModule.register({})],
  controllers: [TalkingFaceController, TalkingFaceAvatarController],
  providers: [TalkingFaceGateway, SadTalkerService, TalkingFaceAvatarController],
})
export class TalkingFaceModule {}
