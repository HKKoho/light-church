import { z } from 'zod';

// The dashboard's Help Assistant keeps its conversation in the browser tab and
// sends the whole (capped) history with each turn — nothing is stored server-side.

export const HELP_ASSISTANT_MAX_MESSAGES = 40;
export const HELP_ASSISTANT_MAX_MESSAGE_CHARS = 20_000;
export const HELP_ASSISTANT_MAX_ATTACHMENTS = 3;
/** Extracted document text kept per attachment — about 15k tokens. */
export const HELP_ASSISTANT_MAX_ATTACHMENT_CHARS = 60_000;

export const helpAssistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(HELP_ASSISTANT_MAX_MESSAGE_CHARS),
});

export const helpAssistantAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  text: z.string().max(HELP_ASSISTANT_MAX_ATTACHMENT_CHARS),
});

export const helpAssistantChatSchema = z.object({
  messages: z
    .array(helpAssistantMessageSchema)
    .min(1)
    .max(HELP_ASSISTANT_MAX_MESSAGES)
    .refine((messages) => messages[messages.length - 1]?.role === 'user', {
      message: 'The last message must be from the user',
    }),
  attachments: z
    .array(helpAssistantAttachmentSchema)
    .max(HELP_ASSISTANT_MAX_ATTACHMENTS)
    .default([]),
  /** Dashboard route the user is on, e.g. `/roll-call` — lets answers start from there. */
  currentPage: z.string().max(200).optional(),
  lang: z.enum(['en', 'zh-TW']).optional(),
});

export type HelpAssistantMessage = z.infer<typeof helpAssistantMessageSchema>;
export type HelpAssistantAttachment = z.infer<typeof helpAssistantAttachmentSchema>;
export type HelpAssistantChatRequest = z.input<typeof helpAssistantChatSchema>;

export interface HelpAssistantSource {
  readonly title: string;
  /** Web URL, or a workspace path such as `/comms/newsletter.md`. */
  readonly url: string;
  readonly kind: 'web' | 'workspace';
}

export interface HelpAssistantChatResponse {
  readonly reply: string;
  readonly sources: readonly HelpAssistantSource[];
}

export interface HelpAssistantExtractResponse {
  readonly name: string;
  readonly text: string;
  /** True when the document was longer than the attachment cap and was cut. */
  readonly truncated: boolean;
}
