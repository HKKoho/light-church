import { z } from 'zod';

export const talkingFaceSpeakSchema = z.object({
  agentDefinitionId: z.string().min(1),
  input: z.string().min(1).max(4000),
  sessionId: z.string().min(1).optional(),
});

export type TalkingFaceSpeakInput = z.infer<typeof talkingFaceSpeakSchema>;
