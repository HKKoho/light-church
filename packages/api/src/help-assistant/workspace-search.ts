// packages/api/src/help-assistant/workspace-search.ts
//
// Lets the Help Assistant find and read files in the user's workspace. Every
// listing and read goes through WorkspaceService, so the same role, department
// and admin-only rules as the Workspace page apply. On top of that, folders
// holding members' personal data are never searched or read here: whatever
// the assistant reads is sent to the church's AI provider.
import path from 'node:path';

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createLogger, type FileEntry } from '@clawix/shared';

import type { Department, UserRole } from '../generated/prisma/enums.js';
import type { WorkspaceService } from '../workspace/workspace.service.js';

const logger = createLogger('help-assistant:workspace-search');

/** Personal-data folders the assistant never touches, whatever the user's access. */
export const EXCLUDED_FOLDERS: readonly string[] = [
  '/pastoral-care',
  '/prayer-requests',
  '/incidents',
  '/consent',
  '/finance/restricted',
  '/skills',
  '/projector',
];

const SEARCHABLE_TYPES: ReadonlySet<FileEntry['type']> = new Set(['markdown', 'text', 'json']);
const MAX_DIRECTORIES = 200;
const MAX_FILES_READ = 300;
const MAX_RESULTS = 8;
const SNIPPET_CHARS = 240;
export const MAX_READ_CHARS = 20_000;

export interface WorkspaceUser {
  readonly userId: string;
  readonly role: UserRole;
  readonly department: Department;
}

export interface WorkspaceHit {
  readonly path: string;
  readonly snippet: string;
}

export function isExcludedPath(filePath: string): boolean {
  // Resolve `..` first so `/comms/../pastoral-care/x.md` can't slip past the list.
  const normalized = path.posix
    .resolve('/', filePath.replace(/\\/g, '/'))
    .replace(/\/+$/, '')
    .toLowerCase();
  return (
    normalized.split('/').some((segment) => segment.startsWith('.')) ||
    EXCLUDED_FOLDERS.some((folder) => normalized === folder || normalized.startsWith(`${folder}/`))
  );
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.;:!?、，。]+/u)
    .filter((term) => term.length > 0);
}

function snippetAround(content: string, term: string): string {
  const index = content.toLowerCase().indexOf(term);
  const start = Math.max(0, index - SNIPPET_CHARS / 2);
  return content
    .slice(start, start + SNIPPET_CHARS)
    .replace(/\s+/g, ' ')
    .trim();
}

export class WorkspaceSearch {
  constructor(private readonly workspace: WorkspaceService) {}

  /** Files whose name or text matches every word of the query, best first. */
  async search(user: WorkspaceUser, query: string): Promise<WorkspaceHit[]> {
    const terms = queryTerms(query);
    if (terms.length === 0) return [];

    const hits: (WorkspaceHit & { score: number })[] = [];
    const queue: string[] = ['/'];
    let directories = 0;
    let filesRead = 0;

    while (directories < MAX_DIRECTORIES) {
      const dir = queue.shift();
      if (dir === undefined) break;
      directories += 1;
      let entries: readonly FileEntry[];
      try {
        entries = (await this.workspace.listDirectory(user.userId, dir, user.role, user.department))
          .entries;
      } catch (err) {
        if (!(err instanceof ForbiddenException)) {
          logger.warn({ err, dir }, 'Skipping unreadable workspace folder');
        }
        continue;
      }

      for (const entry of entries) {
        if (isExcludedPath(entry.path)) continue;
        if (entry.isDirectory) {
          queue.push(entry.path);
          continue;
        }
        const name = entry.name.toLowerCase();
        let content = '';
        if (SEARCHABLE_TYPES.has(entry.type) && filesRead < MAX_FILES_READ) {
          filesRead += 1;
          content = await this.readText(user, entry.path).catch(() => '');
        }
        const haystack = `${name}\n${content.toLowerCase()}`;
        if (!terms.every((term) => haystack.includes(term))) continue;

        const nameMatches = terms.filter((term) => name.includes(term)).length;
        const firstContentTerm = terms.find((term) => content.toLowerCase().includes(term));
        hits.push({
          path: entry.path,
          snippet: firstContentTerm ? snippetAround(content, firstContentTerm) : '',
          score: nameMatches * 10 + (firstContentTerm ? 1 : 0),
        });
      }
    }

    return hits
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ path, snippet }) => ({ path, snippet }));
  }

  /** Text of one workspace file, capped; throws NotFound for excluded or binary files. */
  async readText(user: WorkspaceUser, filePath: string): Promise<string> {
    if (isExcludedPath(filePath)) {
      throw new NotFoundException('That file is not available to the Help Assistant');
    }
    const file = await this.workspace.readFile(user.userId, filePath, user.role, user.department);
    if (file.content === null) {
      throw new NotFoundException('That file has no readable text');
    }
    return file.content.slice(0, MAX_READ_CHARS);
  }
}
