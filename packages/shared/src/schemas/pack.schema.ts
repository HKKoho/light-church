import { z } from 'zod';

export const packToggleSchema = z.object({
  enabled: z.boolean(),
});

export type PackToggleInput = z.infer<typeof packToggleSchema>;
