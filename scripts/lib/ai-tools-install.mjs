// Installs the default AI Tools (./ai-tools/*) into the running API container's
// shared tool directory, /data/AITools. Shared by install.mjs and update.mjs.
//
// Copies go through `docker cp` rather than the host's ./data because the API
// container runs as root and owns ./data/AITools, so the deploy user usually
// can't write there. Tools that are already installed are left alone so an
// admin's replacements survive; `force` overwrites them with the repo versions.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const TARGET = '/data/AITools';

/** @returns {{ name: string, action: 'add' | 'update' | 'skip' }[]} */
export function installAiTools({ root, container = 'lightchurch-api', force = false }) {
  const docker = (...args) => execFileSync('docker', args, { stdio: 'pipe' });
  const tools = readdirSync(join(root, 'ai-tools'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  docker('exec', container, 'mkdir', '-p', TARGET);
  return tools.map((name) => {
    const dest = `${TARGET}/${name}`;
    let exists = true;
    try {
      docker('exec', container, 'test', '-e', dest);
    } catch {
      exists = false;
    }
    if (exists && !force) return { name, action: 'skip' };
    if (exists) docker('exec', container, 'rm', '-rf', dest);
    // No trailing slash on the source: docker cp then creates <TARGET>/<name>.
    docker('cp', join(root, 'ai-tools', name), `${container}:${TARGET}`);
    return { name, action: exists ? 'update' : 'add' };
  });
}
