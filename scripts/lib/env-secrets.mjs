// Secret checks shared by install.mjs and update.mjs.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const PLACEHOLDER = /change[-_ ]?me|changeme|placeholder|example|^secret$|^password$/i;

/** Why a JWT secret is unsafe for production, or null when it is fine. */
export function jwtSecretProblem(value) {
  const v = (value ?? '').trim();
  if (PLACEHOLDER.test(v)) return 'JWT_SECRET is still a placeholder value';
  if (v.length < 32) return 'JWT_SECRET is shorter than 32 characters';
  return null;
}

export function readEnvValue(envFile, key) {
  const text = readFileSync(envFile, 'utf8');
  const match = text.match(new RegExp(`^\\s*${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined;
}

/**
 * Adds `key` with a random hex value when .env doesn't have it yet.
 * Returns true when a value was added. Existing values are never changed.
 */
export function ensureEnvSecret(envFile, key, bytes) {
  if (readEnvValue(envFile, key)) return false;
  const text = readFileSync(envFile, 'utf8');
  const value = randomBytes(bytes).toString('hex');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*#?\\s*${key}=.*$`, 'm');
  writeFileSync(
    envFile,
    pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\s*$/, '')}\n${line}\n`,
  );
  return true;
}
