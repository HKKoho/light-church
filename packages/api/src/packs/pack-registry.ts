import { NGO_AGENTS, type PackAgentDefinition } from './definitions/ngo-agents.data.js';
import { CHURCH_AGENTS } from './definitions/church-agents.data.js';

export type PackId = 'ngo' | 'church';

export interface PackDefinition {
  readonly id: PackId;
  readonly name: string;
  readonly description: string;
  readonly agents: readonly PackAgentDefinition[];
}

export const PACKS: readonly PackDefinition[] = [
  {
    id: 'ngo',
    name: 'NGO Operations',
    description:
      'Program coordination, donor engagement, M&E, communications, field operations, game studio, pastoral care, finance, evangelism & outreach, and Scripture & literacy — 10 specialist worker agents.',
    agents: NGO_AGENTS,
  },
  {
    id: 'church',
    name: 'Church Ministries',
    description:
      'Sermon prep, Sunday school, Bible study, worship planning, prayer journal, church communications, and back-office admin — 7 specialist worker agents.',
    agents: CHURCH_AGENTS,
  },
];

export function findPack(packId: string): PackDefinition | undefined {
  return PACKS.find((pack) => pack.id === packId);
}

export function agentContainerConfig() {
  return {
    image: process.env['AGENT_CONTAINER_IMAGE'] ?? 'clawix-agent:latest',
    cpuLimit: '0.5',
    memoryLimit: '256m',
    timeoutSeconds: 300,
    readOnlyRootfs: false,
    allowedMounts: [],
  };
}

export function agentProviderDefaults(): { provider: string; model: string } {
  return {
    provider: process.env['DEFAULT_PROVIDER'] ?? 'openai',
    model: process.env['DEFAULT_LLM_MODEL'] ?? 'gpt-4o',
  };
}
