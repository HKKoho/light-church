#!/usr/bin/env node
/**
 * Seed the 7 church-ministry specialist worker agents into a running Clawix instance.
 * Run from the repo root: node scripts/seed-church-agents.mjs
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
  console.error('❌  POSTGRES_PASSWORD not found in .env — cannot connect to database.');
  process.exit(1);
}

// From the host, this checkout's Postgres is published on localhost:5443 by both
// docker-compose.dev.yml and docker-compose.prod.yml. (It used to be 5433, which
// other Clawix checkouts on the same machine may still use — never fall back to it.)
const PG_HOST_PORT = 5443;
const DATABASE_URL = `postgresql://${pgUser}:${pgPass}@localhost:${PG_HOST_PORT}/${pgDb}?schema=public`;

console.log(`\nConnecting to: postgresql://${pgUser}:****@localhost:${PG_HOST_PORT}/${pgDb}\n`);

try {
  execSync('pnpm --filter @clawix/api run seed:church', {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
      DEFAULT_PROVIDER: env['DEFAULT_PROVIDER'] || process.env['DEFAULT_PROVIDER'] || 'openai',
      DEFAULT_LLM_MODEL: env['DEFAULT_LLM_MODEL'] || process.env['DEFAULT_LLM_MODEL'] || 'gpt-4o',
      AGENT_CONTAINER_IMAGE:
        env['AGENT_CONTAINER_IMAGE'] ||
        process.env['AGENT_CONTAINER_IMAGE'] ||
        'clawix-agent:latest',
    },
  });
} catch {
  process.exit(1);
}
