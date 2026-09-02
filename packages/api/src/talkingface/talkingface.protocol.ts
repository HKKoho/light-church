import { z } from 'zod';

// --- Client → Server messages ---

const speakStartSchema = z.object({
  type: z.literal('speak.start'),
  payload: z.object({
    agentDefinitionId: z.string().min(1),
    input: z.string().min(1).max(4000),
    sessionId: z.string().min(1).optional(),
  }),
});

const clientMessageSchema = z.discriminatedUnion('type', [speakStartSchema]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const json: unknown = JSON.parse(raw);
    const result = clientMessageSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// --- Server → Client messages ---

export type ServerMessage =
  | {
      readonly type: 'speak.chunk';
      readonly payload: {
        readonly text: string;
        readonly audio: string;
        readonly words: readonly string[];
        readonly wtimes: readonly number[];
        readonly wdurations: readonly number[];
      };
    }
  | { readonly type: 'speak.done'; readonly payload: { readonly sessionId: string | null } }
  | { readonly type: 'speak.error'; readonly payload: { readonly message: string } };

export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}
