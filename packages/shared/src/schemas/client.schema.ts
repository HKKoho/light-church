import { z } from 'zod';

export const createClientAccountSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
  policyId: z.string().cuid(),
  agentDefinitionId: z.string().cuid(),
});

export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>;
