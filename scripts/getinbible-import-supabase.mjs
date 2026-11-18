#!/usr/bin/env node
/**
 * Copy Get in Bible's data from a hosted Supabase project (supabase.com) into
 * the self-hosted one in docker-compose.prod.yml (getinbible-db/-storage).
 *
 * Steps: dump the `public` schema + data with pg_dump (run from the same
 * supabase/postgres image the stack uses, so nothing is installed) → load it into
 * lightchurch-getinbible-db in one transaction → copy every Storage bucket and
 * file through the Storage API → print row counts from both sides.
 *
 * Usage (see infra/docker/getinbible/README.md):
 *   SOURCE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres' \
 *   SOURCE_SUPABASE_URL='https://<ref>.supabase.co' \
 *   SOURCE_SERVICE_KEY='<service_role key>' \
 *   node scripts/getinbible-import-supabase.mjs [--skip-db] [--skip-storage]
 *
 * The cloud project is only read, never changed. The dump (which holds member
 * data and password hashes) is written to data/getinbible-import/ with mode 600.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEnvValue } from './lib/env-secrets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(ROOT, '.env');
const DB_CONTAINER = 'lightchurch-getinbible-db';
// Same image as getinbible-db: its pg_dump 17 reads cloud projects on PG 15 or 17.
const PG_IMAGE = 'supabase/postgres:17.6.1.136';

const args = new Set(process.argv.slice(2));
const skipDb = args.has('--skip-db');
const skipStorage = args.has('--skip-storage');

const step = (msg) => console.log(`\n▸ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
function fail(msg) {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
}

function need(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is not set — see infra/docker/getinbible/README.md`);
  return value;
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', maxBuffer: 1 << 30, ...opts });
  if (result.error) fail(`${cmd}: ${result.error.message}`);
  return result;
}

function psqlLocal(sql) {
  const r = run('docker', [
    'exec',
    '-i',
    DB_CONTAINER,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
  if (r.status !== 0) fail(`local psql failed: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

/** pg_dump from the source project, with the same clean-ups as `supabase db dump`. */
function pgDump(sourceDbUrl, extraArgs) {
  const r = run('docker', [
    'run',
    '--rm',
    '--add-host',
    'host.docker.internal:host-gateway',
    PG_IMAGE,
    'pg_dump',
    sourceDbUrl,
    '--schema=public',
    '--no-owner',
    ...extraArgs,
  ]);
  if (r.status !== 0) {
    fail(
      `pg_dump failed: ${r.stderr.trim()}\n    (check SOURCE_DB_URL: use the Session pooler string, port 5432)`,
    );
  }
  return (
    r.stdout
      .replace(/^\\(un)?restrict .*$/gm, '-- $&')
      .replace(/^CREATE SCHEMA public;$/m, 'CREATE SCHEMA IF NOT EXISTS public;')
      // Supabase's own default grants (owned by supabase_admin) already exist locally.
      .replace(/^ALTER DEFAULT PRIVILEGES .*$/gm, '-- $&')
  );
}

// ── preflight ────────────────────────────────────────────────────────────────
step('Checking the local Get in Bible Supabase');
if (!existsSync(ENV_FILE)) fail('.env not found — run install:clawix first');
const serviceKey = readEnvValue(ENV_FILE, 'GETINBIBLE_SERVICE_KEY');
if (!serviceKey) fail('GETINBIBLE_SERVICE_KEY missing in .env — run update:clawix first');
const port = readEnvValue(ENV_FILE, 'LIGHTCHURCH_GETINBIBLE_PORT') || '3005';
const localUrl = `http://127.0.0.1:${port}`;
if (run('docker', ['inspect', '-f', '{{.State.Running}}', DB_CONTAINER]).stdout.trim() !== 'true') {
  fail(`${DB_CONTAINER} is not running — start it: pnpm run update:clawix`);
}
ok(`${DB_CONTAINER} is running; app at ${localUrl}`);

// ── database ─────────────────────────────────────────────────────────────────
let tables = [];
if (!skipDb) {
  const sourceDbUrl = need('SOURCE_DB_URL');
  const existing = Number(psqlLocal("select count(*) from pg_tables where schemaname = 'public'"));
  if (existing > 0) {
    fail(
      `local database already has ${existing} public tables. To import again, reset it first ` +
        '(README → "Starting over"), or pass --skip-db to copy files only.',
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(ROOT, 'data', 'getinbible-import', stamp);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const schemaFile = join(outDir, 'schema.sql');
  const dataFile = join(outDir, 'data.sql');

  step('Dumping schema and data from supabase.com (public)');
  writeFileSync(schemaFile, pgDump(sourceDbUrl, ['--schema-only']), { mode: 0o600 });
  writeFileSync(dataFile, pgDump(sourceDbUrl, ['--data-only']), { mode: 0o600 });
  chmodSync(schemaFile, 0o600);
  chmodSync(dataFile, 0o600);
  ok(`dump saved to ${outDir}`);

  step('Loading into the local database (single transaction)');
  // Triggers off while loading so rows go in exactly as dumped (FK order safe).
  const script = [
    readFileSync(schemaFile, 'utf8'),
    'SET session_replication_role = replica;',
    readFileSync(dataFile, 'utf8'),
    'SET session_replication_role = DEFAULT;',
  ].join('\n');
  const load = run(
    'docker',
    [
      'exec',
      '-i',
      DB_CONTAINER,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '--single-transaction',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
    ],
    { input: script },
  );
  if (load.status !== 0) fail(`load failed, nothing was changed:\n${load.stderr.trim()}`);
  // The API reads the schema cache; tell PostgREST about the new tables.
  psqlLocal("notify pgrst, 'reload schema'");
  ok('schema and data loaded');

  tables = psqlLocal("select tablename from pg_tables where schemaname = 'public' order by 1")
    .split('\n')
    .filter(Boolean);
}

// ── storage ──────────────────────────────────────────────────────────────────
async function api(base, key, path, init = {}) {
  const res = await fetch(`${base}/storage/v1${path}`, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, ...init.headers },
  });
  if (!res.ok)
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${await res.text()}`);
  return res;
}

async function listAll(base, key, bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await api(base, key, `/object/list/${bucket}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prefix,
        limit: 1000,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    const items = await res.json();
    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders come back without an id.
      if (item.id === null) files.push(...(await listAll(base, key, bucket, path)));
      else files.push({ path, mimetype: item.metadata?.mimetype });
    }
    if (items.length < 1000) return files;
  }
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

if (!skipStorage) {
  const sourceUrl = need('SOURCE_SUPABASE_URL').replace(/\/+$/, '');
  const sourceKey = need('SOURCE_SERVICE_KEY');

  step('Copying Storage buckets and files');
  const buckets = await (await api(sourceUrl, sourceKey, '/bucket')).json();
  const localBuckets = new Set(
    (await (await api(localUrl, serviceKey, '/bucket')).json()).map((b) => b.id),
  );
  for (const bucket of buckets) {
    if (!localBuckets.has(bucket.id)) {
      await api(localUrl, serviceKey, '/bucket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: bucket.id,
          name: bucket.name,
          public: bucket.public,
          file_size_limit: bucket.file_size_limit ?? undefined,
          allowed_mime_types: bucket.allowed_mime_types ?? undefined,
        }),
      });
    }
    const files = await listAll(sourceUrl, sourceKey, bucket.id);
    let copied = 0;
    for (const file of files) {
      const download = await api(
        sourceUrl,
        sourceKey,
        `/object/${bucket.id}/${encodePath(file.path)}`,
      );
      await api(localUrl, serviceKey, `/object/${bucket.id}/${encodePath(file.path)}`, {
        method: 'POST',
        headers: {
          'content-type':
            file.mimetype ?? download.headers.get('content-type') ?? 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: Buffer.from(await download.arrayBuffer()),
      });
      copied += 1;
    }
    ok(`${bucket.id} (${bucket.public ? 'public' : 'private'}): ${copied}/${files.length} files`);
  }
}

// ── verify ───────────────────────────────────────────────────────────────────
if (tables.length > 0) {
  step('Row counts (local) — compare with Table Editor on supabase.com');
  for (const table of tables) {
    console.log(`  ${table.padEnd(34)} ${psqlLocal(`select count(*) from public."${table}"`)}`);
  }
}
console.log(
  `\nDone. Open ${localUrl} (or Scripture & Learning → Get in Bible) and sign in as usual.`,
);
