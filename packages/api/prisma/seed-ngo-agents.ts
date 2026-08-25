/**
 * Seeds the NGO Operations pack's worker agents into Clawix.
 * Run via: node scripts/seed-ngo-agents.mjs  (from repo root)
 *
 * Agent definitions live in ../src/packs/definitions/ngo-agents.data.ts — the single
 * source of truth also used by the Ministry Packs settings tab / API.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { NGO_AGENTS } from '../src/packs/definitions/ngo-agents.data.js';

dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '.env') });

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const CONTAINER_CONFIG = {
  image: process.env['AGENT_CONTAINER_IMAGE'] ?? 'clawix-agent:latest',
  cpuLimit: '0.5',
  memoryLimit: '256m',
  timeoutSeconds: 300,
  readOnlyRootfs: false,
  allowedMounts: [],
};

const provider = process.env['DEFAULT_PROVIDER'] ?? 'openai';
const model = process.env['DEFAULT_LLM_MODEL'] ?? 'gpt-4o';

async function main() {
  console.log('\n=== Clawix NGO Agent Seed ===\n');

  let created = 0;
  let skipped = 0;

  for (const agentDef of NGO_AGENTS) {
    const existing = await prisma.agentDefinition.findFirst({
      where: { name: agentDef.name, role: 'worker' },
    });

    if (existing) {
      console.log(`  ↩ skipped  ${agentDef.name} (already exists)`);
      skipped++;
      continue;
    }

    await prisma.agentDefinition.create({
      data: {
        name: agentDef.name,
        description: agentDef.description,
        systemPrompt: agentDef.systemPrompt,
        role: 'worker',
        provider,
        model,
        maxTokensPerRun: 50000,
        containerConfig: CONTAINER_CONFIG,
        isActive: true,
      },
    });

    console.log(`  ✓ created  ${agentDef.name}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.\n`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
