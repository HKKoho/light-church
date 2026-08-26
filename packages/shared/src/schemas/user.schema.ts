import { z } from 'zod';

// NOTE: `client` is intentionally NOT in this enum. Client (headless API) accounts are
// only created via the dedicated `POST /admin/clients` endpoint (createClientAccountSchema),
// which enforces the required user-agent binding in one transaction. The generic
// admin create/update endpoints must not be able to assign the role on their own.
const userRoleSchema = z.enum([
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
  'ministry_leader',
  'volunteer',
  'guest',
]);

const departmentSchema = z.enum([
  'all',
  'program_coordination',
  'donor_engagement',
  'monitoring_evaluation',
  'communications',
  'field_operations',
  'pastoral_care',
  'finance',
  'outreach',
  'scripture_literacy',
]);

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(128),
  role: userRoleSchema,
  department: departmentSchema.default('all'),
  policyId: z.string().cuid(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
  department: departmentSchema.optional(),
  isActive: z.boolean().optional(),
  policyId: z.string().cuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
