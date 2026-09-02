import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { TalkingFaceGateway } from '../talkingface.gateway.js';

vi.mock('@clawix/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clawix/shared')>();
  return {
    ...actual,
    createLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  };
});

function mockSocket(overrides?: Record<string, unknown>) {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };
}

function mockRequest(url: string): IncomingMessage {
  return { url } as IncomingMessage;
}

function sentAudioChunks(socket: ReturnType<typeof mockSocket>) {
  return socket.send.mock.calls
    .map((call: string[]) => JSON.parse(call[0]))
    .filter((msg: { type: string }) => msg.type === 'speak.chunk');
}

const mockJwtService = { verifyAsync: vi.fn() };
const mockConfigService = { getOrThrow: vi.fn().mockReturnValue('test-jwt-secret') };
const mockHttpAdapterHost = { httpAdapter: { getHttpServer: vi.fn().mockReturnValue({}) } };
const mockAgentDefRepo = { findById: vi.fn() };
const mockAgentRunner = { run: vi.fn() };
const mockTts = { synthesize: vi.fn() };

describe('TalkingFaceGateway', () => {
  let gateway: TalkingFaceGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('test-jwt-secret');
    mockTts.synthesize.mockResolvedValue({
      audio: Buffer.from('fake-wav'),
      sampleRate: 22050,
      durationMs: 500,
    });
    gateway = new TalkingFaceGateway(
      mockJwtService as never,
      mockConfigService as never,
      mockHttpAdapterHost as never,
      mockAgentDefRepo as never,
      mockAgentRunner as never,
      mockTts as never,
    );
  });

  describe('handleConnection', () => {
    it('rejects a connection with no token', async () => {
      const socket = mockSocket();
      await gateway.handleConnection(socket as never, mockRequest('/ws/talkingface'));
      expect(socket.close).toHaveBeenCalledWith(4001, 'unauthorized');
    });

    it('rejects a connection with an invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
      const socket = mockSocket();
      await gateway.handleConnection(
        socket as never,
        mockRequest('/ws/talkingface?token=bad'),
      );
      expect(socket.close).toHaveBeenCalledWith(4001, 'unauthorized');
    });

    it('registers a message handler that dispatches speak.start to handleSpeak', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      const handleSpeakSpy = vi
        .spyOn(gateway as unknown as { handleSpeak: () => Promise<void> }, 'handleSpeak')
        .mockResolvedValue(undefined);

      const socket = mockSocket();
      await gateway.handleConnection(socket as never, mockRequest('/ws/talkingface?token=ok'));

      const messageCb = socket.on.mock.calls.find(([e]: string[]) => e === 'message')?.[1] as (
        raw: string,
      ) => void;
      expect(messageCb).toBeDefined();

      messageCb(
        JSON.stringify({
          type: 'speak.start',
          payload: { agentDefinitionId: 'agent-1', input: 'Hi', sessionId: undefined },
        }),
      );

      expect(handleSpeakSpy).toHaveBeenCalledWith('user-1', socket, {
        agentDefinitionId: 'agent-1',
        input: 'Hi',
        sessionId: undefined,
      });
    });
  });

  describe('handleSpeak', () => {
    const call = (
      userId: string,
      socket: ReturnType<typeof mockSocket>,
      payload: { agentDefinitionId: string; input: string; sessionId?: string },
    ) =>
      (
        gateway as unknown as {
          handleSpeak: (
            userId: string,
            socket: unknown,
            payload: typeof payload,
          ) => Promise<void>;
        }
      ).handleSpeak(userId, socket, payload);

    it('synthesizes a single chunk when streaming is disabled', async () => {
      mockAgentDefRepo.findById.mockResolvedValue({ streamingEnabled: false });
      mockAgentRunner.run.mockResolvedValue({
        agentRunId: 'run-1',
        sessionId: 'sess-1',
        output: 'Hello there.',
        status: 'completed',
        tokenUsage: {},
        streamingUsed: false,
      });

      const socket = mockSocket();
      await call('user-1', socket, { agentDefinitionId: 'agent-1', input: 'Hi' });

      expect(mockAgentRunner.run).toHaveBeenCalledWith(
        expect.not.objectContaining({ onEvent: expect.anything() }),
      );
      expect(mockTts.synthesize).toHaveBeenCalledTimes(1);
      expect(mockTts.synthesize).toHaveBeenCalledWith('Hello there.');
      const chunks = sentAudioChunks(socket);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].payload.text).toBe('Hello there.');
      const doneMsg = JSON.parse(socket.send.mock.calls.at(-1)[0]);
      expect(doneMsg).toEqual({ type: 'speak.done', payload: { sessionId: 'sess-1' } });
    });

    it('streams each completed sentence as its own chunk, then flushes the remainder', async () => {
      mockAgentDefRepo.findById.mockResolvedValue({ streamingEnabled: true });
      mockAgentRunner.run.mockImplementation(async (opts: { onEvent?: (e: unknown) => Promise<void> }) => {
        await opts.onEvent?.({
          type: 'assistant_chunk',
          content: 'Hello there. How are you',
          isFinal: false,
        });
        await opts.onEvent?.({
          type: 'assistant_chunk',
          content: '? I am fine.',
          isFinal: true,
        });
        return {
          agentRunId: 'run-2',
          sessionId: 'sess-2',
          output: 'Hello there. How are you? I am fine.',
          status: 'completed',
          tokenUsage: {},
          streamingUsed: true,
        };
      });

      const socket = mockSocket();
      await call('user-1', socket, { agentDefinitionId: 'agent-1', input: 'Hi' });

      expect(mockTts.synthesize).toHaveBeenCalledTimes(3);
      expect(mockTts.synthesize).toHaveBeenNthCalledWith(1, 'Hello there.');
      expect(mockTts.synthesize).toHaveBeenNthCalledWith(2, 'How are you?');
      expect(mockTts.synthesize).toHaveBeenNthCalledWith(3, 'I am fine.');
      const chunks = sentAudioChunks(socket);
      expect(chunks.map((c: { payload: { text: string } }) => c.payload.text)).toEqual([
        'Hello there.',
        'How are you?',
        'I am fine.',
      ]);
      const doneMsg = JSON.parse(socket.send.mock.calls.at(-1)[0]);
      expect(doneMsg).toEqual({ type: 'speak.done', payload: { sessionId: 'sess-2' } });
    });

    it('sends speak.error and does not throw when the run fails', async () => {
      mockAgentDefRepo.findById.mockRejectedValue(new Error('agent not found'));

      const socket = mockSocket();
      await expect(
        call('user-1', socket, { agentDefinitionId: 'missing', input: 'Hi' }),
      ).resolves.toBeUndefined();

      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'speak.error', payload: { message: 'agent not found' } }),
      );
    });
  });
});
