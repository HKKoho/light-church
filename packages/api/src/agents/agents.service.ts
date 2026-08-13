import { ForbiddenException, Injectable } from '@nestjs/common';

import type {
  CreateAgentDefinitionInput,
  PaginatedResponse,
  PaginationInput,
  UpdateAgentDefinitionInput,
} from '@clawix/shared';
import { listProviders } from '@clawix/shared';
import type { AgentDefinition, AgentRun } from '../generated/prisma/client.js';
import { AgentDefinitionRepository } from '../db/agent-definition.repository.js';
import { AgentRunRepository } from '../db/agent-run.repository.js';
import { UserAgentRepository } from '../db/user-agent.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Roles allowed to turn browser tools on for an agent. Deliberately narrower than
// "who can edit an agent at all" (see updateAgent) — browser automation reaches
// external sites, so it gets its own opt-in gate on top of the normal edit check,
// same layered pattern as the incidents/keys workspace fix.
const BROWSER_TOOLS_CONFIG_ROLES = new Set([
  'super_admin',
  'senior_pastor',
  'pastor',
  'admin_staff',
]);

@Injectable()
export class AgentsService {
  constructor(
    private readonly agentDefRepo: AgentDefinitionRepository,
    private readonly agentRunRepo: AgentRunRepository,
    private readonly userAgentRepo: UserAgentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listAgents(
    pagination: PaginationInput,
    role?: 'primary' | 'worker',
    options?: { includeCreatedBy?: boolean },
  ): Promise<PaginatedResponse<AgentDefinition>> {
    if (role) {
      return this.agentDefRepo.findByRole(role, pagination);
    }
    return this.agentDefRepo.findAll(pagination, options);
  }

  async getAgent(id: string, userId?: string, userRole?: string): Promise<AgentDefinition> {
    const agent = await this.agentDefRepo.findById(id);
    if (userRole === 'super_admin' || !userId) {
      return agent;
    }
    if (agent.isOfficial || agent.createdById === userId) {
      return agent;
    }
    const assigned = await this.userAgentRepo.existsForUser(userId, id);
    if (!assigned) {
      throw new ForbiddenException('You do not have access to this agent');
    }
    return agent;
  }

  async createAgent(
    input: CreateAgentDefinitionInput,
    createdById?: string,
    userRole?: string,
  ): Promise<AgentDefinition> {
    // Only admins may create Public (official) agents; force false otherwise
    // so non-admins can't escalate by setting the flag in the request body.
    const isOfficial = userRole === 'super_admin' ? (input.isOfficial ?? false) : false;
    this.assertBrowserToolsConfigAllowed(input, userRole);
    return this.agentDefRepo.create({ ...input, createdById, isOfficial });
  }

  async updateAgent(
    id: string,
    input: UpdateAgentDefinitionInput & { readonly isActive?: boolean },
    userId?: string,
    userRole?: string,
  ): Promise<AgentDefinition> {
    if (userRole !== 'super_admin') {
      const existing = await this.agentDefRepo.findById(id);
      if (existing.isOfficial || existing.createdById !== userId) {
        throw new ForbiddenException('You can only edit your own custom agent definitions');
      }
    }
    this.assertBrowserToolsConfigAllowed(input, userRole);
    return this.agentDefRepo.update(id, input);
  }

  /**
   * Browser automation reaches external sites, so enabling it is gated to
   * pastoral/admin-staff tiers even when the caller already passed the
   * general edit check above (e.g. a non-admin owner of their own custom agent).
   */
  private assertBrowserToolsConfigAllowed(
    input: UpdateAgentDefinitionInput & { readonly isActive?: boolean },
    userRole?: string,
  ): void {
    if (input.toolConfig?.browserToolsEnabled !== true) return;
    if (!userRole || !BROWSER_TOOLS_CONFIG_ROLES.has(userRole)) {
      throw new ForbiddenException('Only pastoral or admin staff may enable browser tools on an agent');
    }
  }

  async deleteAgent(id: string, userId?: string, userRole?: string): Promise<AgentDefinition> {
    if (userRole !== 'super_admin') {
      const existing = await this.agentDefRepo.findById(id);
      if (existing.isOfficial || existing.createdById !== userId) {
        throw new ForbiddenException('You can only delete your own custom agent definitions');
      }
    }
    return this.agentDefRepo.delete(id);
  }

  async listAgentRuns(
    agentDefinitionId: string,
    pagination: PaginationInput,
    userId?: string,
    userRole?: string,
  ): Promise<PaginatedResponse<AgentRun>> {
    const scopeUserId = userRole === 'super_admin' ? undefined : userId;
    return this.agentRunRepo.findByAgentDefinitionId(agentDefinitionId, pagination, scopeUserId);
  }

  async listUserAgents(userId: string, userRole: string) {
    if (userRole === 'super_admin') {
      return this.userAgentRepo.findAllWithDetails();
    }
    return this.userAgentRepo.findAllByUserIdWithDetails(userId);
  }

  async createSubAgent(
    input: {
      readonly userId: string;
      readonly name: string;
      readonly description?: string;
      readonly systemPrompt: string;
      readonly provider: string;
      readonly model: string;
      readonly maxTokensPerRun?: number;
    },
    createdById?: string,
  ) {
    // Find user's primary agent to get workspace path
    const primaryUserAgent = await this.userAgentRepo.findByUserId(input.userId);
    const workspacePath = primaryUserAgent?.workspacePath ?? `users/${input.userId}/workspace`;

    // Create the agent definition with role=worker
    const agentDef = await this.agentDefRepo.create({
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      provider: input.provider,
      model: input.model,
      maxTokensPerRun: input.maxTokensPerRun,
      role: 'worker',
      isOfficial: false,
      createdById,
    });

    // Create the user-agent binding with same workspace as primary
    const userAgent = await this.userAgentRepo.create({
      userId: input.userId,
      agentDefinitionId: agentDef.id,
      workspacePath,
    });

    return { agentDefinition: agentDef, userAgent };
  }

  async assignUserAgent(input: { readonly userId: string; readonly agentDefinitionId: string }) {
    const primaryUserAgent = await this.userAgentRepo.findByUserId(input.userId);
    const workspacePath = primaryUserAgent?.workspacePath ?? `users/${input.userId}/workspace`;

    return this.userAgentRepo.create({
      userId: input.userId,
      agentDefinitionId: input.agentDefinitionId,
      workspacePath,
    });
  }

  async updateUserAgent(id: string, input: { readonly agentDefinitionId: string }) {
    return this.userAgentRepo.update(id, { agentDefinitionId: input.agentDefinitionId });
  }

  async deleteUserAgent(id: string) {
    return this.userAgentRepo.delete(id);
  }

  async listConfiguredProviders() {
    // Fetch all enabled provider configs from DB
    const configs = await this.prisma.providerConfig.findMany({
      where: { isEnabled: true },
      select: { provider: true, displayName: true },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    });

    // Build a map of configured provider names for quick lookup
    const configuredNames = new Set(configs.map((c) => c.provider));

    // Get built-in providers that are configured
    const builtinProviders = listProviders()
      .filter((p) => p.name !== 'custom' && configuredNames.has(p.name))
      .map((p) => ({
        name: p.name,
        displayName: p.displayName,
        defaultModel: p.defaultModel,
        models: (p.pricing ?? []).map((m) => m.model),
      }));

    // Get custom providers (in DB but not in built-in list)
    const builtinNames = new Set(listProviders().map((p) => p.name));
    const customProviders = configs
      .filter((c) => !builtinNames.has(c.provider))
      .map((c) => ({
        name: c.provider,
        displayName: c.displayName,
        defaultModel: '',
        models: [] as string[], // Empty array allows custom model input in UI
      }));

    return [...builtinProviders, ...customProviders];
  }
}
