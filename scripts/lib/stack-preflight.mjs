// Pre-flight checks shared by install.mjs and update.mjs, run BEFORE anything is
// built or started:
//   1. This checkout's *other* stack (dev vs prod) must not be running — both
//      compose files use the same project name, container names and database
//      volume, so `up` for one silently replaces the other.
//   2. Every host port the chosen stack publishes must be free, except for
//      ports held by this very stack's own containers (they get recreated).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

/** Minimal .env reader (KEY=VALUE, optional quotes, # comments). */
export function readDotEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i.exec(line);
    if (!m || line.trimStart().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

/**
 * Host ports published by each stack. Production web/API default to 3000/3001
 * (Caddy/Nginx proxy them) and can be moved with LIGHTCHURCH_WEB_PORT /
 * LIGHTCHURCH_API_PORT — docker-compose.prod.yml reads the same variables.
 */
export function stackPorts(deployMode, envFile) {
  const env = { ...readDotEnv(envFile), ...process.env };
  const num = (v, d) => (v && /^\d+$/.test(v) ? Number(v) : d);
  return deployMode === 'production'
    ? {
        web: num(env.LIGHTCHURCH_WEB_PORT, 3000),
        api: num(env.LIGHTCHURCH_API_PORT, 3001),
        postgres: 5443,
        redis: 6390,
      }
    : { web: 3010, api: 3011, postgres: 5443, redis: 6390 };
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

/** Running containers with their compose project dir, config files and published ports. */
function runningContainers() {
  const fmt =
    '{{.Names}}\t{{.Label "com.docker.compose.project.working_dir"}}\t' +
    '{{.Label "com.docker.compose.project.config_files"}}\t{{.Ports}}';
  return sh(`docker ps --format '${fmt}'`)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', workingDir = '', configFiles = '', ports = ''] = line.split('\t');
      return { name, workingDir, configFiles, ports };
    });
}

/** Non-Docker processes listening on a TCP port (Docker's own proxies excluded). */
function hostListeners(port) {
  const lsof = sh(`lsof -nP -iTCP:${port} -sTCP:LISTEN -Fpc`);
  if (lsof) {
    const found = [];
    let pid = '';
    for (const line of lsof.split('\n')) {
      if (line.startsWith('p')) pid = line.slice(1);
      if (line.startsWith('c')) found.push({ pid, name: line.slice(1) });
    }
    return found.filter((p) => !/docker|vpnkit|com\.docke/i.test(p.name));
  }
  // Linux without lsof: `ss` lists users:(("name",pid=123,fd=4))
  const ss = sh(`ss -Hltnp 'sport = :${port}'`);
  return [...ss.matchAll(/\("([^"]+)",pid=(\d+)/g)]
    .map((m) => ({ name: m[1], pid: m[2] }))
    .filter((p) => !/docker/i.test(p.name));
}

/**
 * Returns human-readable problems; an empty array means it's safe to start.
 * `root` is the checkout directory, `composeFile` the absolute path of the
 * compose file about to be used.
 */
export function stackPreflight({ root, composeFile, deployMode, ports }) {
  const problems = [];
  const containers = runningContainers();
  const file = basename(composeFile);
  const ours = (c) =>
    c.workingDir === root && c.configFiles.split(',').some((f) => basename(f) === file);

  const otherStack = containers.filter((c) => c.workingDir === root && !ours(c));
  if (otherStack.length > 0) {
    const other = deployMode === 'production' ? 'development' : 'production';
    const otherFile =
      deployMode === 'production' ? 'docker-compose.dev.yml' : 'docker-compose.prod.yml';
    problems.push(
      `This checkout's ${other} stack is running (${otherStack.map((c) => c.name).join(', ')}). ` +
        `Development and production share container names and the database volume, so starting ` +
        `${deployMode} would replace it. Stop it first (data is kept): ` +
        `docker compose -f ${otherFile} down`,
    );
  }

  for (const [role, port] of Object.entries(ports)) {
    const holders = [
      ...containers
        // This checkout's other stack is already reported above.
        .filter((c) => c.workingDir !== root && new RegExp(`:${port}->`).test(c.ports))
        .map((c) => `container ${c.name} (another project)`),
      ...hostListeners(port).map((p) => `${p.name} (pid ${p.pid})`),
    ];
    if (holders.length > 0) {
      const hint =
        deployMode === 'production' && (role === 'web' || role === 'api')
          ? ` Free it, or choose another port with LIGHTCHURCH_${role.toUpperCase()}_PORT in .env.`
          : ' Free it before continuing.';
      problems.push(
        `Port ${port} (${role}) is in use by ${[...new Set(holders)].join(', ')}.${hint}`,
      );
    }
  }
  return problems;
}
