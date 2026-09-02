import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import { createLogger } from '@clawix/shared';

import { AgentDefinitionRepository } from '../db/agent-definition.repository.js';
import { AgentRunnerService } from '../engine/agent-runner.service.js';
import type { ReasoningEvent } from '../engine/reasoning-loop.types.js';
import { PiperTtsService } from '../tts/tts.service.js';
import { estimateWordTimings } from '../tts/word-timing.js';
import { SentenceChunker } from './sentence-chunker.js';
import { parseClientMessage, serializeServerMessage } from './talkingface.protocol.js';

const logger = createLogger('talkingface:gateway');

const WS_OPEN = 1;

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  policyName: string;
}

/**
 * WebSocket gateway that streams agent replies to the talking-face avatar
 * sentence-by-sentence: each completed sentence is synthesized and pushed
 * to the client as soon as it's ready, instead of waiting for the full
 * reply before starting playback. Uses raw `ws` for Fastify compatibility,
 * same as `channels/web/web.gateway.ts`.
 */
@Injectable()
export class TalkingFaceGateway implements OnModuleInit, OnModuleDestroy {
  private wss: WebSocketServer | null = null;
  private server: Server | null = null;
  private readonly upgradeListener = (req: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (pathname !== '/ws/talkingface' || !this.wss) return;
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss?.emit('connection', ws, req);
    });
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly agentDefRepo: AgentDefinitionRepository,
    private readonly agentRunner: AgentRunnerService,
    private readonly tts: PiperTtsService,
  ) {}

  onModuleInit(): void {
    const server = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.server = server;
    this.wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', this.upgradeListener);

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      void this.handleConnection(socket, req);
    });

    logger.info('WebSocket server listening on /ws/talkingface');
  }

  onModuleDestroy(): void {
    if (this.server) {
      this.server.removeListener('upgrade', this.upgradeListener);
      this.server = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info('WebSocket server closed');
    }
  }

  async handleConnection(socket: WebSocket, req: IncomingMessage): Promise<void> {
    const token = this.extractToken(req);
    if (!token) {
      logger.warn('WebSocket connection rejected — no token');
      socket.close(4001, 'unauthorized');
      return;
    }

    let payload: JwtPayload;
    try {
      const secret = this.configService.getOrThrow<string>('JWT_SECRET');
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ error: msg }, 'WebSocket connection rejected — invalid JWT');
      socket.close(4001, 'unauthorized');
      return;
    }

    const userId = payload.sub;

    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      void (async () => {
        const raw = typeof data === 'string' ? data : data.toString();
        const message = parseClientMessage(raw);
        if (!message) {
          logger.warn({ userId }, 'Ignoring malformed talkingface WS message');
          return;
        }
        await this.handleSpeak(userId, socket, message.payload);
      })();
    });

    socket.on('error', (err: Error) => {
      logger.error({ userId, error: err.message }, 'WebSocket error');
    });

    socket.on('close', () => {
      logger.info({ userId }, 'talkingface WebSocket connection closed');
    });
  }

  private async handleSpeak(
    userId: string,
    socket: WebSocket,
    payload: { agentDefinitionId: string; input: string; sessionId?: string },
  ): Promise<void> {
    try {
      const agentDef = await this.agentDefRepo.findById(payload.agentDefinitionId);
      const chunker = new SentenceChunker();
      let streamedAny = false;

      const speakSentence = async (sentence: string): Promise<void> => {
        const { audio, durationMs } = await this.tts.synthesize(sentence);
        const { words, wtimes, wdurations } = estimateWordTimings(sentence, durationMs);
        if (socket.readyState !== WS_OPEN) return;
        socket.send(
          serializeServerMessage({
            type: 'speak.chunk',
            payload: { text: sentence, audio: audio.toString('base64'), words, wtimes, wdurations },
          }),
        );
      };

      const onEvent = agentDef.streamingEnabled
        ? async (e: ReasoningEvent): Promise<void> => {
            if (e.type !== 'assistant_chunk' || e.content.trim().length === 0) return;
            for (const sentence of chunker.push(e.content)) {
              streamedAny = true;
              await speakSentence(sentence);
            }
          }
        : undefined;

      const result = await this.agentRunner.run({
        agentDefinitionId: payload.agentDefinitionId,
        input: payload.input,
        userId,
        sessionId: payload.sessionId,
        channel: 'internal',
        ...(onEvent ? { onEvent } : {}),
      });

      const remainder = chunker.flush();
      if (remainder) {
        streamedAny = true;
        await speakSentence(remainder);
      }

      if (!streamedAny) {
        await speakSentence(result.output ?? 'The agent did not return a response.');
      }

      if (socket.readyState === WS_OPEN) {
        socket.send(
          serializeServerMessage({
            type: 'speak.done',
            payload: { sessionId: result.sessionId },
          }),
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error({ userId, err }, 'talkingface speak failed');
      if (socket.readyState === WS_OPEN) {
        socket.send(serializeServerMessage({ type: 'speak.error', payload: { message } }));
      }
    }
  }

  private extractToken(req: IncomingMessage): string | null {
    const url = new URL(req.url ?? '', 'http://localhost');
    return url.searchParams.get('token');
  }
}
