// Installs the default AI Tools (./ai-tools/*) into the running API container's
// shared tool directory, /data/AITools. Shared by install.mjs and update.mjs.
//
// Copies go through `docker cp` rather than the host's ./data because the API
// container runs as root and owns ./data/AITools, so the deploy user usually
// can't write there. Tools that are already installed are left alone so an
// admin's replacements survive; `force` overwrites them with the repo versions.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fillToolPlaceholders, toolEnv } from './tool-placeholders.mjs';

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
    // tool.json may carry ${VAR:-default} placeholders (e.g. a link tool's URL):
    // fill them in a temp copy so the container gets real values.
    let src = join(root, 'ai-tools', name);
    let tmp = null;
    const toolJson = join(src, 'tool.json');
    if (existsSync(toolJson) && readFileSync(toolJson, 'utf8').includes('${')) {
      tmp = mkdtempSync(join(tmpdir(), 'ai-tool-'));
      cpSync(src, join(tmp, name), { recursive: true });
      const filled = fillToolPlaceholders(readFileSync(toolJson, 'utf8'), toolEnv(root));
      writeFileSync(join(tmp, name, 'tool.json'), filled);
      src = join(tmp, name);
    }
    try {
      // No trailing slash on the source: docker cp then creates <TARGET>/<name>.
      docker('cp', src, `${container}:${TARGET}`);
    } finally {
      if (tmp) rmSync(tmp, { recursive: true, force: true });
    }
    return { name, action: exists ? 'update' : 'add' };
  });
}
