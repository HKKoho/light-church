// packages/api/src/ai-tools/ai-tools.service.ts
import * as path from 'path';
import * as fs from 'fs/promises';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { aiToolNameSchema, aiToolStorageSchema, createLogger } from '@clawix/shared';
import type { AiToolDetail, AiToolDisplayName, AiToolSummary } from '@clawix/shared';

import { ScopedFs } from '../workspace/scoped-fs.js';
import { signSsoToken, type SsoUser } from './tool-sso.js';

const logger = createLogger('ai-tools');

const MAX_TOOL_HTML_SIZE = 2 * 1024 * 1024; // 2 MB
const HTML_EXTENSIONS = new Set(['.html', '.htm']);

// Optional per-tool metadata. A tool folder with only a `tool.json` carrying a
// `url` is an external link tool (e.g. a vetted third-party AI app).
const toolMetaSchema = z.object({
  displayName: z
    .object({
      en: z.string().trim().min(1).max(64).optional(),
      'zh-TW': z.string().trim().min(1).max(64).optional(),
    })
    .optional(),
  // A plain string, or { en, 'zh-TW' } for per-language descriptions.
  description: z
    .union([
      z.string().max(500),
      z.object({
        en: z.string().max(500).optional(),
        'zh-TW': z.string().max(500).optional(),
      }),
    ])
    .optional(),
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), 'Only http(s) URLs are allowed')
    .optional(),
  // Only these user roles see and open the tool (default: everyone).
  roles: z.array(z.string().max(32)).max(20).optional(),
  // Single sign-on into a link tool: the API signs a short-lived hand-off with
  // the secret in env var `secretEnv` (name must end in _SSO_SECRET, so a
  // tool.json can't point at other secrets) and the viewer POSTs it to url+path.
  sso: z
    .object({
      secretEnv: z.string().regex(/^[A-Z0-9_]+_SSO_SECRET$/),
      path: z
        .string()
        .regex(/^\/[A-Za-z0-9/_-]*$/)
        .max(200),
      audience: z.string().regex(/^[a-z0-9-]{1,64}$/),
    })
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
  private static resolveRoot(dir: string): string {
    return path.resolve(process.env['WORKSPACE_BASE_PATH'] ?? './data', dir);
  }

  private async createScopedFs(): Promise<ScopedFs> {
    const root = AiToolsService.resolveRoot('AITools');
    await fs.mkdir(root, { recursive: true });
    return new ScopedFs(root);
  }

  // Per-user tool storage lives outside both the shared AITools directory and
  // the user's workspace, so agent containers never see it (it can hold member
  // names, e.g. attendance lists).
  private async createStorageFs(): Promise<ScopedFs> {
    const root = AiToolsService.resolveRoot('AITools-data');
    await fs.mkdir(root, { recursive: true });
    return new ScopedFs(root);
  }

  private static storagePath(userId: string, name: string): string {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(userId)) throw new BadRequestException('Invalid user');
    return `/${userId}/${name}.json`;
  }

  private static parseName(raw: string): string {
    const result = aiToolNameSchema.safeParse(raw);
    if (!result.success) throw new BadRequestException('Invalid tool name');
    return result.data;
  }

  private static toDisplayName(meta: ToolMeta): AiToolDisplayName | null {
    const en = meta.displayName?.en ?? null;
    const zh = meta.displayName?.['zh-TW'] ?? null;
    return en || zh ? { en, 'zh-TW': zh } : null;
  }

  private static toDescriptions(meta: ToolMeta): {
    description: string | null;
    descriptions: AiToolDisplayName | null;
  } {
    const d = meta.description;
    if (d === undefined) return { description: null, descriptions: null };
    if (typeof d === 'string') return { description: d, descriptions: null };
    const en = d.en ?? null;
    const zh = d['zh-TW'] ?? null;
    return { description: en ?? zh, descriptions: en || zh ? { en, 'zh-TW': zh } : null };
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

  private static allows(meta: ToolMeta, role: string): boolean {
    return !meta.roles || meta.roles.includes(role);
  }

  /** null when the tool doesn't exist, is invalid, or `role` may not use it. */
  private async summarize(
    sfs: ScopedFs,
    name: string,
    role: string,
  ): Promise<AiToolSummary | null> {
    const meta = await this.readMeta(sfs, name);
    if (!AiToolsService.allows(meta, role)) return null;
    const { description, descriptions } = AiToolsService.toDescriptions(meta);
    const displayName = AiToolsService.toDisplayName(meta);
    if (await sfs.exists(`/${name}/index.html`)) {
      return { name, displayName, kind: 'html', description, descriptions, url: null, sso: false };
    }
    if (meta.url) {
      const sso = Boolean(meta.sso);
      return { name, displayName, kind: 'link', description, descriptions, url: meta.url, sso };
    }
    return null;
  }

  async list(role: string): Promise<AiToolSummary[]> {
    const sfs = await this.createScopedFs();
    const dirents = await sfs.readdir('/');
    const tools: AiToolSummary[] = [];
    for (const dirent of dirents) {
      if (!dirent.isDirectory() || !aiToolNameSchema.safeParse(dirent.name).success) continue;
      const tool = await this.summarize(sfs, dirent.name, role);
      if (tool) tools.push(tool);
    }
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(rawName: string, role: string): Promise<AiToolDetail> {
    const name = AiToolsService.parseName(rawName);
    const sfs = await this.createScopedFs();
    const tool = await this.summarize(sfs, name, role);
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
    return {
      name,
      displayName: AiToolsService.toDisplayName(meta),
      kind: 'html',
      ...AiToolsService.toDescriptions(meta),
      url: null,
      sso: false,
    };
  }

  async getStorage(rawName: string, userId: string, role: string): Promise<Record<string, string>> {
    const name = AiToolsService.parseName(rawName);
    await this.get(name, role); // 404 for unknown (or not permitted) tools
    const sfs = await this.createStorageFs();
    const file = AiToolsService.storagePath(userId, name);
    if (!(await sfs.exists(file))) return {};
    try {
      const parsed: unknown = JSON.parse((await sfs.readFile(file, 'utf-8')) as string);
      const result = aiToolStorageSchema.safeParse({ data: parsed });
      if (result.success) return result.data.data;
    } catch {
      // Fall through to an empty store rather than breaking the tool.
    }
    logger.warn({ name, userId }, 'Ignoring unreadable AI tool storage');
    return {};
  }

  async putStorage(
    rawName: string,
    userId: string,
    role: string,
    data: Record<string, string>,
  ): Promise<void> {
    const name = AiToolsService.parseName(rawName);
    await this.get(name, role);
    const sfs = await this.createStorageFs();
    await sfs.writeFile(AiToolsService.storagePath(userId, name), JSON.stringify(data));
  }

  /** Signs a single-sign-on hand-off for a link tool with an `sso` block. */
  async ssoLaunch(rawName: string, user: SsoUser): Promise<{ action: string; token: string }> {
    const name = AiToolsService.parseName(rawName);
    const sfs = await this.createScopedFs();
    const meta = await this.readMeta(sfs, name);
    if (!meta.url || !AiToolsService.allows(meta, user.role)) {
      throw new NotFoundException(`AI tool "${name}" not found`);
    }
    if (!meta.sso) throw new BadRequestException(`AI tool "${name}" has no single sign-on`);
    const secret = process.env[meta.sso.secretEnv] ?? '';
    if (secret.length < 32) {
      throw new ServiceUnavailableException(
        `Single sign-on for "${name}" is not configured (${meta.sso.secretEnv})`,
      );
    }
    const action = new URL(meta.sso.path, meta.url).toString();
    logger.info({ name, userId: user.sub, role: user.role }, 'Issued AI tool SSO hand-off');
    return { action, token: signSsoToken(user, meta.sso.audience, secret) };
  }

  async remove(rawName: string): Promise<void> {
    const name = AiToolsService.parseName(rawName);
    const sfs = await this.createScopedFs();
    if (!(await sfs.exists(`/${name}`))) throw new NotFoundException(`AI tool "${name}" not found`);
    await sfs.remove(`/${name}`);
    logger.info({ name }, 'Removed AI tool');
  }
}
