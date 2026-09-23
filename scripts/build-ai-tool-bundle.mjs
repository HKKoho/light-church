#!/usr/bin/env node
/**
 * Inline a built static web app (e.g. a Vite `dist/`) into ONE self-contained
 * index.html, the format Phase 1 AI Tools accept (rendered via iframe srcDoc,
 * so relative asset URLs can't be fetched).
 *
 * Usage:
 *   node scripts/build-ai-tool-bundle.mjs <dist-dir> <out-tool-dir> [--description "..."]
 *
 * Example:
 *   node scripts/build-ai-tool-bundle.mjs reference/RollCall/dist "ai-tools/RollCall 點名" \
 *     --description "Take attendance for a service or meeting."
 *
 * Inlines <script src> and <link rel="stylesheet"> that point inside <dist-dir>;
 * drops favicon links. Fails if the result exceeds the 2 MB AI Tool limit.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const MAX_BYTES = 2 * 1024 * 1024;

const [distDir, outDir, ...rest] = process.argv.slice(2);
if (!distDir || !outDir) {
  console.error('Usage: build-ai-tool-bundle.mjs <dist-dir> <out-tool-dir> [--description "..."]');
  process.exit(1);
}
const descIndex = rest.indexOf('--description');
const description = descIndex >= 0 ? rest[descIndex + 1] : undefined;

const root = path.resolve(distDir);
const resolveAsset = (ref) => {
  const file = path.resolve(root, ref.replace(/^\//, ''));
  if (!file.startsWith(root + path.sep)) throw new Error(`Asset outside dist: ${ref}`);
  return file;
};

let html = await readFile(path.join(root, 'index.html'), 'utf-8');

html = html.replace(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>\s*/gi, '');

const scripts = [...html.matchAll(/<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi)];
for (const [tag, before, src, after] of scripts) {
  if (/^https?:/i.test(src)) continue;
  // "</script" inside the code would end the inline element early.
  const code = (await readFile(resolveAsset(src), 'utf-8')).replace(/<\/script/gi, '<\\/script');
  const attrs = `${before}${after}`.replace(/\s*crossorigin(=["'][^"']*["'])?/gi, '');
  html = html.replace(tag, () => `<script${attrs}>${code}</script>`);
}

const styles = [...html.matchAll(/<link([^>]*)rel=["']stylesheet["']([^>]*)>/gi)];
for (const [tag] of styles) {
  const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
  if (!href || /^https?:/i.test(href)) continue;
  const css = (await readFile(resolveAsset(href), 'utf-8')).replace(/<\/style/gi, '<\\/style');
  html = html.replace(tag, () => `<style>${css}</style>`);
}

const size = Buffer.byteLength(html);
if (size > MAX_BYTES) {
  console.error(`Bundle is ${(size / 1024).toFixed(0)} KB — over the 2 MB AI Tool limit.`);
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.html'), html);
if (description) {
  await writeFile(path.join(outDir, 'tool.json'), JSON.stringify({ description }, null, 2) + '\n');
}
console.log(`Wrote ${path.join(outDir, 'index.html')} (${(size / 1024).toFixed(0)} KB)`);
