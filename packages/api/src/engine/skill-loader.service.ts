import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { createLogger } from '@clawix/shared';
import {
  parseFrontmatter as parseGenericFrontmatter,
  stripFrontmatter,
} from '../common/frontmatter.js';
import { scanContextContent } from './prompt-injection-scanner.js';
import type { SkillFrontmatter, SkillInfo } from './skill-loader.types.js';
import {
  SKILL_NAME_PATTERN,
  MAX_SKILL_NAME_LENGTH,
  MAX_SKILL_DESCRIPTION_LENGTH,
  DEFAULT_MAX_SKILLS_PER_USER,
  MAX_SKILL_FILE_SIZE,
} from './skill-loader.types.js';

export { stripFrontmatter };

export function parseFrontmatter(content: string): SkillFrontmatter | null {
  const parsed = parseGenericFrontmatter(content);
  if (parsed === null) return null;

  const name = parsed['name'];
  const description = parsed['description'];

  if (!name || !description) return null;
  if (name.length > MAX_SKILL_NAME_LENGTH) return null;
  if (!SKILL_NAME_PATTERN.test(name)) return null;
  if (description.length > MAX_SKILL_DESCRIPTION_LENGTH) return null;

  return {
    name,
    description,
    ...(parsed['version'] !== undefined ? { version: parsed['version'] } : {}),
    ...(parsed['author'] !== undefined ? { author: parsed['author'] } : {}),
    ...(parsed['tags'] !== undefined ? { tags: parseTags(parsed['tags']) } : {}),
  };
}

function parseTags(raw: string): readonly string[] {
  const trimmed = raw.replace(/^\[|\]$/g, '');
  return trimmed
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

const logger = createLogger('engine:skill-loader');

@Injectable()
export class SkillLoaderService {
  constructor(
    private readonly builtinDir: string,
    private readonly maxSkillsPerUser: number = DEFAULT_MAX_SKILLS_PER_USER,
  ) {}

  async listSkills(customDir: string): Promise<readonly SkillInfo[]> {
    const customSkills = await this.scanDirectory(
      customDir,
      'custom',
      '/workspace/skills',
      this.maxSkillsPerUser,
    );
    const customDirNames = new Set(customSkills.map((s) => s.dirName));
    const builtinSkills = await this.scanDirectory(this.builtinDir, 'builtin', '/skills/builtin');
    const filteredBuiltins = builtinSkills.filter((s) => !customDirNames.has(s.dirName));
    return [
      ...customSkills.map(({ dirName: _, ...rest }) => rest),
      ...filteredBuiltins.map(({ dirName: _, ...rest }) => rest),
    ];
  }

  async buildSkillsSummary(
    customDir: string,
    allowedDirNames?: readonly string[],
  ): Promise<string> {
    const allSkills = await this.listSkills(customDir);
    const skills =
      allowedDirNames && allowedDirNames.length > 0
        ? allSkills.filter((s) => {
            const parts = s.path.split('/').filter(Boolean);
            const dirName = parts[parts.length - 2] ?? '';
            return allowedDirNames.includes(dirName);
          })
        : allSkills;
    if (skills.length === 0) return '';
    const lines = ['<skills>'];
    for (const skill of skills) {
      const safeDescription = scanContextContent(
        skill.description,
        `skill:${skill.name}`,
      ).sanitized;
      lines.push('  <skill>');
      lines.push(`    <name>${escapeXml(skill.name)}</name>`);
      lines.push(`    <description>${escapeXml(safeDescription)}</description>`);
      lines.push(`    <location>${escapeXml(skill.path)}</location>`);
      lines.push(`    <source>${skill.source}</source>`);
      lines.push('  </skill>');
    }
    lines.push('</skills>');
    return lines.join('\n');
  }

  private async scanDirectory(
    dirPath: string,
    source: 'builtin' | 'custom',
    containerBasePath: string,
    limit?: number,
  ): Promise<readonly (SkillInfo & { readonly dirName: string })[]> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }
    const results: (SkillInfo & { readonly dirName: string })[] = [];
    for (const entry of entries) {
      // Check symlinks BEFORE isDirectory — on Linux, symlinks to dirs report isDirectory()=false
      if (entry.isSymbolicLink()) {
        logger.warn({ name: entry.name, dirPath }, 'Skipping symlinked skill directory');
        continue;
      }
      if (!entry.isDirectory()) continue;

      const skillMdPath = path.join(dirPath, entry.name, 'SKILL.md');
      let stat: import('fs').Stats;
      try {
        stat = await fs.stat(skillMdPath);
      } catch {
        continue;
      }
      if (stat.size > MAX_SKILL_FILE_SIZE) {
        logger.warn(
          { name: entry.name, size: stat.size },
          'SKILL.md exceeds 1MB size limit, skipping',
        );
        continue;
      }
      let content: string;
      try {
        content = await fs.readFile(skillMdPath, 'utf-8');
      } catch {
        continue;
      }
      const frontmatter = parseFrontmatter(content);
      if (frontmatter === null) {
        logger.warn({ name: entry.name, dirPath }, 'Invalid or missing frontmatter, skipping');
        continue;
      }
      results.push({
        dirName: entry.name,
        name: frontmatter.name,
        description: frontmatter.description,
        path: `${containerBasePath}/${entry.name}/SKILL.md`,
        source,
      });
      if (limit !== undefined && results.length >= limit) {
        logger.warn({ limit }, 'Max skills per user reached');
        break;
      }
    }
    return results;
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
