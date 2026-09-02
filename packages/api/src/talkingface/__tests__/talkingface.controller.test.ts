import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JwtPayload } from '../../auth/auth.types.js';
import type { AgentRunnerService } from '../../engine/agent-runner.service.js';
import type { PiperTtsService } from '../../tts/tts.service.js';
import { estimateWordTimings } from '../../tts/word-timing.js';
import { TalkingFaceController } from '../talkingface.controller.js';

describe('TalkingFaceController', () => {
  let mockAgentRunner: { run: ReturnType<typeof vi.fn> };
  let mockTts: { synthesize: ReturnType<typeof vi.fn> };
  let controller: TalkingFaceController;
  const req = { user: { sub: 'user-1' } as JwtPayload };

  beforeEach(() => {
    mockAgentRunner = { run: vi.fn() };
    mockTts = { synthesize: vi.fn() };
    controller = new TalkingFaceController(
      mockAgentRunner as unknown as AgentRunnerService,
      mockTts as unknown as PiperTtsService,
    );
  });

  it('runs the agent, synthesizes the reply, and returns audio + word timings', async () => {
    mockAgentRunner.run.mockResolvedValue({
      agentRunId: 'run-1',
      sessionId: 'sess-1',
      output: 'Hello there',
      status: 'completed',
      tokenUsage: {},
      streamingUsed: false,
    });
    const audio = Buffer.from('fake-wav-bytes');
    mockTts.synthesize.mockResolvedValue({ audio, sampleRate: 22050, durationMs: 1000 });

    const result = await controller.speak(req, {
      agentDefinitionId: 'agent-1',
      input: 'Hi',
      sessionId: undefined,
    });

    expect(mockAgentRunner.run).toHaveBeenCalledWith({
      agentDefinitionId: 'agent-1',
      input: 'Hi',
      userId: 'user-1',
      sessionId: undefined,
      channel: 'internal',
    });
    expect(mockTts.synthesize).toHaveBeenCalledWith('Hello there');
    expect(result.text).toBe('Hello there');
    expect(result.sessionId).toBe('sess-1');
    expect(result.audio).toBe(audio.toString('base64'));
    expect(result).toMatchObject(estimateWordTimings('Hello there', 1000));
  });

  it('passes sessionId through when provided, to resume the conversation', async () => {
    mockAgentRunner.run.mockResolvedValue({
      agentRunId: 'run-2',
      sessionId: 'sess-1',
      output: 'Still here',
      status: 'completed',
      tokenUsage: {},
      streamingUsed: false,
    });
    mockTts.synthesize.mockResolvedValue({
      audio: Buffer.from(''),
      sampleRate: 22050,
      durationMs: 500,
    });

    await controller.speak(req, {
      agentDefinitionId: 'agent-1',
      input: 'Are you there?',
      sessionId: 'sess-1',
    });

    expect(mockAgentRunner.run).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-1' }),
    );
  });

  it('falls back to a placeholder message when the agent returns no output', async () => {
    mockAgentRunner.run.mockResolvedValue({
      agentRunId: 'run-3',
      sessionId: 'sess-2',
      output: null,
      status: 'completed',
      tokenUsage: {},
      streamingUsed: false,
    });
    mockTts.synthesize.mockResolvedValue({
      audio: Buffer.from(''),
      sampleRate: 22050,
      durationMs: 500,
    });

    const result = await controller.speak(req, {
      agentDefinitionId: 'agent-1',
      input: 'Hi',
      sessionId: undefined,
    });

    expect(result.text).toBe('The agent did not return a response.');
    expect(mockTts.synthesize).toHaveBeenCalledWith('The agent did not return a response.');
  });
});
