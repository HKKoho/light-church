import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@clawix/shared';

import type { PaginatedResponse, PaginationInput } from '@clawix/shared';
import type { AgentRunModel } from '../generated/prisma/models.js';
import { AgentRunRepository } from '../db/agent-run.repository.js';

type AgentRunWithAgentName = AgentRunModel & { agentDefinition: { name: string } };

export interface ClientRunDownload {
  readonly filename: string;
  readonly content: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class ClientRunsService {
  constructor(private readonly agentRunRepo: AgentRunRepository) {}

  async listMyRuns(
    userId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedResponse<AgentRunWithAgentName>> {
    return this.agentRunRepo.findByUserId(userId, pagination);
  }

  async downloadRun(userId: string, runId: string): Promise<ClientRunDownload> {
    const run = await this.agentRunRepo.findByIdForUser(runId, userId);

    if (!run.output) {
      throw new NotFoundError('AgentRun', runId);
    }

    const date = (run.completedAt ?? run.startedAt).toISOString().slice(0, 10);
    const slug = slugify(run.agentDefinition.name) || 'agent';
    const filename = `${slug}-${date}-${run.id.slice(-6)}.md`;

    return { filename, content: run.output };
  }
}
