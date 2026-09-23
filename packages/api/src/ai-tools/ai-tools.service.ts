// packages/api/src/ai-tools/ai-tools.service.ts
import * as path from 'path';
import * as fs from 'fs/promises';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { aiToolNameSchema, createLogger } from '@clawix/shared';
import type { AiToolDetail, AiToolSummary } from '@clawix/shared';

import { ScopedFs } from '../workspace/scoped-fs.js';

const logger = createLogger('ai-tools');

const MAX_TOOL_HTML_SIZE = 2 * 1024 * 1024; // 2 MB
const HTML_EXTENSIONS = new Set(['.html', '.htm']);

// Optional per-tool metadata. A tool folder with only a `tool.json` carrying a
// `url` is an external link tool (e.g. a vetted third-party AI app).
const toolMetaSchema = z.object({
  description: z.string().max(500).optional(),
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) URLs are allowed')
    .optional(),
});
type ToolMeta = z.infer<typeof toolMetaSchema>;

/**
 * Phase 1 "AI as a Tool": a church-wide directory of AI tools, shared by every
 * user (unlike the per-user workspace). Each tool is a folder named after the
 * tool under `<WORKSPACE_BASE_PATH>/AITools/`, holding an `index.html` and/or a
 * `tool.json` ({ description?, url? }).
 */
@Injectable()
export class AiToolsService {
  private async createScopedFs(): Promise<ScopedFs> {
    const root = path.resolve(process.env['WORKSPACE_BASE_PATH'] ?? './data', 'AITools');
    await fs.mkdir(root, { recursive: true });
    return new ScopedFs(root);
  }

  private static parseName(raw: string): string {
    const result = aiToolNameSchema.safeParse(raw);
    if (!result.success) throw new BadRequestException('Invalid tool name');
    return result.data;
  }

  private async readMeta(sfs: ScopedFs, name: string): Promise<ToolMeta> {
    const metaPath = `/${name}/tool.json`;
    if (!(await sfs.exists(metaPath))) return {};
    try {
      const raw = (await sfs.readFile(metaPath, 'utf-8')) as string;
      const parsed = toolMetaSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      // Fall through — a malformed tool.json shouldn't hide the tool's HTML.
    }
    logger.warn({ name }, 'Ignoring invalid tool.json');
    return {};
  }

  private async summarize(sfs: ScopedFs, name: string): Promise<AiToolSummary | null> {
    const meta = await this.readMeta(sfs, name);
    const description = meta.description ?? null;
    if (await sfs.exists(`/${name}/index.html`)) {
      return { name, kind: 'html', description, url: null };
    }
    if (meta.url) {
      return { name, kind: 'link', description, url: meta.url };
    }
    return null;
  }

  async list(): Promise<AiToolSummary[]> {
    const sfs = await this.createScopedFs();
    const dirents = await sfs.readdir('/');
    const tools: AiToolSummary[] = [];
    for (const dirent of dirents) {
      if (!dirent.isDirectory() || !aiToolNameSchema.safeParse(dirent.name).success) continue;
      const tool = await this.summarize(sfs, dirent.name);
      if (tool) tools.push(tool);
    }
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(rawName: string): Promise<AiToolDetail> {
    const name = AiToolsService.parseName(rawName);
    const sfs = await this.createScopedFs();
    const tool = await this.summarize(sfs, name);
    if (!tool) throw new NotFoundException(`AI tool "${name}" not found`);
    const html =
      tool.kind === 'html'
        ? ((await sfs.readFile(`/${name}/index.html`, 'utf-8')) as string)
        : null;
    return { ...tool, html };
  }

  async upload(rawName: string, filename: string, data: Buffer): Promise<AiToolSummary> {
    const name = AiToolsService.parseName(rawName);
    if (!HTML_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
      throw new BadRequestException('AI tools must be a single .html file');
    }
    if (data.length > MAX_TOOL_HTML_SIZE) {
      throw new BadRequestException('AI tool file exceeds the 2 MB limit');
    }
    const sfs = await this.createScopedFs();
    await sfs.writeFile(`/${name}/index.html`, data);
    logger.info({ name, size: data.length }, 'Uploaded AI tool');
    const meta = await this.readMeta(sfs, name);
    return { name, kind: 'html', description: meta.description ?? null, url: null };
  }

  async remove(rawName: string): Promise<void> {
    const name = AiToolsService.parseName(rawName);
    const sfs = await this.createScopedFs();
    if (!(await sfs.exists(`/${name}`))) throw new NotFoundException(`AI tool "${name}" not found`);
    await sfs.remove(`/${name}`);
    logger.info({ name }, 'Removed AI tool');
  }
}
