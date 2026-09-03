#!/usr/bin/env node
/**
 * NGO setup — Phase 2 + 3
 * Updates the primary agent as NGO orchestrator and seeds workspace + skills.
 * Run from repo root: node scripts/setup-ngo.mjs
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENV_FILE = join(ROOT, '.env');

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const result = {};
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?(.*?)"?\s*$/);
    if (m) result[m[1]] = m[2];
  }
  return result;
}

const env = parseEnv(ENV_FILE);

const pgUser = env['POSTGRES_USER'] || 'clawix';
const pgPass = env['POSTGRES_PASSWORD'];
const pgDb = env['POSTGRES_DB'] || 'clawix';

if (!pgPass) {
  console.error('❌  POSTGRES_PASSWORD not found in .env');
  process.exit(1);
}

const DATABASE_URL = `postgresql://${pgUser}:${pgPass}@localhost:5433/${pgDb}?schema=public`;
console.log(`\nConnecting to: postgresql://${pgUser}:****@localhost:5433/${pgDb}\n`);

try {
  execSync('pnpm --filter @clawix/api run setup:ngo', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
      DEFAULT_PROVIDER: env['DEFAULT_PROVIDER'] || 'openai',
      DEFAULT_LLM_MODEL: env['DEFAULT_LLM_MODEL'] || 'gpt-4o',
      AGENT_CONTAINER_IMAGE: env['AGENT_CONTAINER_IMAGE'] || 'clawix-agent:latest',
    },
  });
} catch {
  process.exit(1);
}
