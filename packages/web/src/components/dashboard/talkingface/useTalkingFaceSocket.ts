'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getAccessToken } from '@/lib/auth';

export interface SpeakChunk {
  text: string;
  audio: string;
  words: string[];
  wtimes: number[];
  wdurations: number[];
}

/** Server→Client WebSocket protocol (mirrors talkingface.protocol.ts) */
type ServerMessage =
  | { type: 'speak.chunk'; payload: SpeakChunk }
  | { type: 'speak.done'; payload: { sessionId: string | null } }
  | { type: 'speak.error'; payload: { message: string } };

interface UseTalkingFaceSocketOptions {
  onChunk: (chunk: SpeakChunk) => void;
  onDone: (sessionId: string | null) => void;
  onError: (message: string) => void;
}

/**
 * Persistent WebSocket connection to `/ws/talkingface`, opened lazily on the
 * first `sendSpeak` call. Each reply streams back as a series of `speak.chunk`
 * messages (one Piper synthesis per agent sentence) followed by `speak.done`
 * — see `talkingface.gateway.ts` for the server side.
 */
export function useTalkingFaceSocket({ onChunk, onDone, onError }: UseTalkingFaceSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({ onChunk, onDone, onError });
  callbacksRef.current = { onChunk, onDone, onError };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const ensureConnected = useCallback(async (): Promise<WebSocket> => {
    const existing = wsRef.current;
    if (existing?.readyState === WebSocket.OPEN) {
      return existing;
    }

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase =
      process.env['NEXT_PUBLIC_WS_URL'] || `${protocol}//${window.location.hostname}:3001`;
    const ws = new WebSocket(`${wsBase}/ws/talkingface?token=${token}`);

    ws.onmessage = (event: MessageEvent<string>) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      if (message.type === 'speak.chunk') {
        callbacksRef.current.onChunk(message.payload);
      } else if (message.type === 'speak.done') {
        callbacksRef.current.onDone(message.payload.sessionId);
      } else if (message.type === 'speak.error') {
        callbacksRef.current.onError(message.payload.message);
      }
    };

    wsRef.current = ws;

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        resolve(ws);
      };
      ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
    });
  }, []);

  const sendSpeak = useCallback(
    async (agentDefinitionId: string, input: string, sessionId?: string): Promise<void> => {
      const ws = await ensureConnected();
      ws.send(
        JSON.stringify({
          type: 'speak.start',
          payload: { agentDefinitionId, input, sessionId },
        }),
      );
    },
    [ensureConnected],
  );

  return { sendSpeak };
}
