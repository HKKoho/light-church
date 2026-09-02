import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { talkingFaceSpeakSchema, type TalkingFaceSpeakInput } from '@clawix/shared';

import type { JwtPayload } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AgentRunnerService } from '../engine/agent-runner.service.js';
import { PiperTtsService } from '../tts/tts.service.js';
import { estimateWordTimings } from '../tts/word-timing.js';

export interface TalkingFaceSpeakResponse {
  readonly text: string;
  readonly sessionId: string | null;
  readonly audio: string;
  readonly words: string[];
  readonly wtimes: number[];
  readonly wdurations: number[];
}

@ApiTags('talkingface')
@Controller('api/v1/talkingface')
export class TalkingFaceController {
  constructor(
    private readonly agentRunner: AgentRunnerService,
    private readonly tts: PiperTtsService,
  ) {}

  @Post('speak')
  async speak(
    @Req() req: { user: JwtPayload },
    @Body(new ZodValidationPipe(talkingFaceSpeakSchema)) body: TalkingFaceSpeakInput,
  ): Promise<TalkingFaceSpeakResponse> {
    const result = await this.agentRunner.run({
      agentDefinitionId: body.agentDefinitionId,
      input: body.input,
      userId: req.user.sub,
      sessionId: body.sessionId,
      channel: 'internal',
    });

    const text = result.output ?? 'The agent did not return a response.';
    const { audio, durationMs } = await this.tts.synthesize(text);
    const { words, wtimes, wdurations } = estimateWordTimings(text, durationMs);

    return {
      text,
      sessionId: result.sessionId,
      audio: audio.toString('base64'),
      words,
      wtimes,
      wdurations,
    };
  }
}
