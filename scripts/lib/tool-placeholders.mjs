// Fills `${VAR}` / `${VAR:-default}` placeholders in an AI Tool's tool.json
// (e.g. a link tool's per-deployment URL) from the environment, then .env.
// Shared by seed-ai-tools.mjs (host copy) and ai-tools-install.mjs (docker cp).
import { join } from 'node:path';
import { readDotEnv } from './stack-preflight.mjs';

export function toolEnv(root) {
  return { ...readDotEnv(join(root, '.env')), ...process.env };
}

export function fillToolPlaceholders(text, env) {
  return text.replace(/\$\{([A-Z0-9_]+)(?::-([^}]*))?\}/g, (match, name, fallback) => {
    const value = env[name] || fallback;
    // Values land inside JSON strings — escape quotes/backslashes.
    if (value !== undefined) return JSON.stringify(value).slice(1, -1);
    throw new Error(`${name} is not set (needed by ${match} in an AI Tool's tool.json)`);
  });
}
