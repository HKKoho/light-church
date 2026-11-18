// Secrets for the self-hosted Get in Bible Supabase (docker-compose.prod.yml
// services getinbible-db / -rest / -storage). Shared by install.mjs and
// update.mjs; existing values are never changed.
import { createHmac } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { ensureEnvSecret, readEnvValue } from './env-secrets.mjs';

const TEN_YEARS = 10 * 365 * 24 * 60 * 60;

const b64url = (value) => Buffer.from(value).toString('base64url');

/** HS256 JWT in the shape Supabase uses for its anon / service_role API keys. */
export function signSupabaseKey(role, secret, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ role, iss: 'supabase', iat: now, exp: now + TEN_YEARS }));
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function setEnvValue(envFile, key, value) {
  const text = readFileSync(envFile, 'utf8');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*#?\\s*${key}=.*$`, 'm');
  writeFileSync(
    envFile,
    pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\s*$/, '')}\n${line}\n`,
  );
}

/**
 * Ensures the Get in Bible database password, JWT secret and the two API keys
 * signed with it exist in .env. Returns the keys that were added.
 */
export function ensureGetinbibleSecrets(envFile) {
  const added = [];
  if (ensureEnvSecret(envFile, 'GETINBIBLE_POSTGRES_PASSWORD', 24)) {
    added.push('GETINBIBLE_POSTGRES_PASSWORD');
  }
  const newSecret = ensureEnvSecret(envFile, 'GETINBIBLE_JWT_SECRET', 32);
  if (newSecret) added.push('GETINBIBLE_JWT_SECRET');
  const secret = readEnvValue(envFile, 'GETINBIBLE_JWT_SECRET');
  for (const [key, role] of [
    ['GETINBIBLE_ANON_KEY', 'anon'],
    ['GETINBIBLE_SERVICE_KEY', 'service_role'],
  ]) {
    // Re-sign when the secret is new so keys always match it.
    if (newSecret || !readEnvValue(envFile, key)) {
      setEnvValue(envFile, key, signSupabaseKey(role, secret));
      added.push(key);
    }
  }
  return added;
}
