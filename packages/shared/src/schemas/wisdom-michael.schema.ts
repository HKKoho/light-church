import { z } from 'zod';

// Michael, the course teaching assistant (ported from GetinBible): a signed-in
// member asks about the lesson step they are on and gets a short reply that
// guides their thinking rather than handing them an answer. Nothing is stored;
// the browser resends the recent conversation each turn, and the member's own
// saved answers are never sent to the model.

/** The steps of a lesson, in order. */
export const WISDOM_LESSON_STEPS = [
  'questions',
  'perspectives',
  'tension',
  'discussion',
  'summary',
] as const;
export type WisdomLessonStep = (typeof WISDOM_LESSON_STEPS)[number];

/** Earlier turns sent with each question, so the reply can follow on. */
export const WISDOM_MICHAEL_MAX_HISTORY = 6;
export const WISDOM_MICHAEL_MAX_QUESTION = 1000;

const wisdomMichaelMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

export const askWisdomMichaelSchema = z.object({
  step: z.enum(WISDOM_LESSON_STEPS),
  question: z.string().trim().min(1).max(WISDOM_MICHAEL_MAX_QUESTION),
  history: z.array(wisdomMichaelMessageSchema).max(WISDOM_MICHAEL_MAX_HISTORY).default([]),
  /** The site language; Michael otherwise answers in the language of the question. */
  lang: z.enum(['en', 'zh-TW']).optional(),
});
export type WisdomMichaelMessage = z.infer<typeof wisdomMichaelMessageSchema>;
export type AskWisdomMichaelInput = z.input<typeof askWisdomMichaelSchema>;
export type AskWisdomMichaelData = z.output<typeof askWisdomMichaelSchema>;

export interface WisdomMichaelReply {
  readonly reply: string;
}
