import { Injectable, NotFoundException } from '@nestjs/common';
import { createLogger } from '@clawix/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { AgentRole } from '../generated/prisma/enums.js';
import { agentContainerConfig, agentProviderDefaults, findPack, PACKS } from './pack-registry.js';

const logger = createLogger('packs');

export type PackStatus = 'not_installed' | 'partial' | 'active' | 'disabled';

export interface PackAgentStatus {
  readonly name: string;
  readonly installed: boolean;
  readonly isActive: boolean;
}

export interface PackSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly totalAgents: number;
  readonly installedCount: number;
  readonly status: PackStatus;
  readonly agents: readonly PackAgentStatus[];
}

@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<readonly PackSummary[]> {
    return Promise.all(PACKS.map((pack) => this.summarize(pack.id)));
  }

  async install(packId: string): Promise<PackSummary> {
    const pack = findPack(packId);
    if (!pack) throw new NotFoundException(`Unknown pack "${packId}"`);

    const containerConfig = agentContainerConfig();
    const { provider, model } = agentProviderDefaults();

    let created = 0;
    for (const agentDef of pack.agents) {
      const existing = await this.prisma.agentDefinition.findFirst({
        where: { name: agentDef.name, role: AgentRole.worker },
      });
      if (existing) continue;

      await this.prisma.agentDefinition.create({
        data: {
          name: agentDef.name,
          description: agentDef.description,
          systemPrompt: agentDef.systemPrompt,
          role: AgentRole.worker,
          provider,
          model,
          maxTokensPerRun: 50000,
          containerConfig,
          isActive: true,
        },
      });
      created++;
    }

    logger.info({ packId, created, total: pack.agents.length }, 'Pack install complete');
    return this.summarize(packId);
  }

  async setEnabled(packId: string, enabled: boolean): Promise<PackSummary> {
    const pack = findPack(packId);
    if (!pack) throw new NotFoundException(`Unknown pack "${packId}"`);

    await this.prisma.agentDefinition.updateMany({
      where: { name: { in: pack.agents.map((a) => a.name) }, role: AgentRole.worker },
      data: { isActive: enabled },
    });

    logger.info({ packId, enabled }, 'Pack toggled');
    return this.summarize(packId);
  }

  private async summarize(packId: string): Promise<PackSummary> {
    const pack = findPack(packId);
    if (!pack) throw new NotFoundException(`Unknown pack "${packId}"`);

    const rows = await this.prisma.agentDefinition.findMany({
      where: { name: { in: pack.agents.map((a) => a.name) }, role: AgentRole.worker },
      select: { name: true, isActive: true },
    });
    const rowsByName = new Map(rows.map((r) => [r.name, r]));

    const agents: PackAgentStatus[] = pack.agents.map((a) => {
      const row = rowsByName.get(a.name);
      return { name: a.name, installed: row !== undefined, isActive: row?.isActive ?? false };
    });

    const installedCount = agents.filter((a) => a.installed).length;
    const totalAgents = pack.agents.length;

    let status: PackStatus;
    if (installedCount === 0) {
      status = 'not_installed';
    } else if (installedCount < totalAgents) {
      status = 'partial';
    } else if (agents.every((a) => a.isActive)) {
      status = 'active';
    } else if (agents.every((a) => !a.isActive)) {
      status = 'disabled';
    } else {
      status = 'partial';
    }

    return {
      id: pack.id,
      name: pack.name,
      description: pack.description,
      totalAgents,
      installedCount,
      status,
      agents,
    };
  }
}
