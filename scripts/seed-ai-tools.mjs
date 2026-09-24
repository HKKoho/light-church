#!/usr/bin/env node
/**
 * Copy the default Phase 1 AI Tools from ./ai-tools/ into the shared tool
 * directory <WORKSPACE_BASE_PATH>/AITools/ (default ./data/AITools/).
 *
 * Existing tools are left alone so an admin's replacements survive; pass
 * --force to overwrite them with the repo versions.
 *
 * tool.json may use `${VAR}` / `${VAR:-default}` placeholders (e.g. a link
 * tool's per-deployment URL). They are filled from the environment, then .env,
 * when the tool is installed.
 *
 * Usage:
 *   node scripts/seed-ai-tools.mjs [--force]
 */
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fillToolPlaceholders, toolEnv } from './lib/tool-placeholders.mjs';

const force = process.argv.includes('--force');
const env = toolEnv(process.cwd());
const source = path.resolve('ai-tools');
const target = path.resolve(process.env.WORKSPACE_BASE_PATH ?? './data', 'AITools');

await mkdir(target, { recursive: true });
const entries = await readdir(source, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const dest = path.join(target, entry.name);
  const exists = await stat(dest).then(
    () => true,
    () => false,
  );
  if (exists && !force) {
    console.log(`skip   ${entry.name} (already installed; use --force to replace)`);
    continue;
  }
  await cp(path.join(source, entry.name), dest, { recursive: true, force: true });
  const toolJson = path.join(dest, 'tool.json');
  const raw = await readFile(toolJson, 'utf8').catch(() => null);
  if (raw !== null && raw.includes('${')) await writeFile(toolJson, fillToolPlaceholders(raw, env));
  console.log(`${exists ? 'update' : 'add   '} ${entry.name}`);
}
console.log(`AI Tools directory: ${target}`);
