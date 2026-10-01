// packages/api/src/help-assistant/__tests__/workspace-search.test.ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FileEntry } from '@clawix/shared';

import type { WorkspaceService } from '../../workspace/workspace.service.js';
import {
  isExcludedPath,
  MAX_READ_CHARS,
  WorkspaceSearch,
  type WorkspaceUser,
} from '../workspace-search.js';

const user = { userId: 'u1', role: 'staff', department: 'all' } as unknown as WorkspaceUser;

function file(p: string, type: FileEntry['type'] = 'markdown'): FileEntry {
  return {
    name: p.split('/').pop() ?? p,
    path: p,
    size: 1,
    modifiedAt: '',
    isDirectory: false,
    type,
  };
}
function dir(p: string): FileEntry {
  return { ...file(p), isDirectory: true, type: 'directory' };
}

const tree: Record<string, FileEntry[]> = {
  '/': [
    dir('/comms'),
    dir('/pastoral-care'),
    dir('/finance'),
    dir('/broken'),
    file('/.secret.md'),
    file('/easter-plan.md'),
  ],
  '/comms': [file('/comms/newsletter.md'), file('/comms/logo.png', 'image')],
  '/pastoral-care': [file('/pastoral-care/visit.md')],
};
const contents: Record<string, string | null> = {
  '/easter-plan.md': 'Easter service plan with choir',
  '/comms/newsletter.md': 'This month: Easter choir rehearsal on Friday',
  '/pastoral-care/visit.md': 'Easter visit to a member',
  '/comms/logo.png': null,
};

function makeWorkspace() {
  const listDirectory = vi.fn(async (_u: string, p: string) => {
    if (p === '/finance') throw new ForbiddenException('outside your department');
    if (p === '/broken') throw new Error('disk error');
    return { path: p, parent: null, entries: tree[p] ?? [] };
  });
  const readFile = vi.fn(async (_u: string, p: string) => ({
    ...file(p),
    content: contents[p] ?? null,
    truncated: false,
  }));
  return {
    search: new WorkspaceSearch({ listDirectory, readFile } as unknown as WorkspaceService),
    listDirectory,
    readFile,
  };
}

describe('isExcludedPath', () => {
  it.each([
    ['/pastoral-care/a.md', true],
    ['/Pastoral-Care', true],
    ['/comms/../prayer-requests/x.md', true],
    ['/finance/restricted/a.csv', true],
    ['/.env', true],
    ['/comms/.hidden/a.md', true],
    ['/finance/budget.csv', false],
    ['/pastoral-care-guide.md', false],
    ['comms/news.md', false],
  ])('%s → %s', (p, expected) => {
    expect(isExcludedPath(p)).toBe(expected);
  });
});

describe('WorkspaceSearch.search', () => {
  it('matches all words across name and text, ranks name matches first, skips excluded and forbidden folders', async () => {
    const { search, listDirectory, readFile } = makeWorkspace();
    const hits = await search.search(user, 'Easter choir');
    expect(hits.map((h) => h.path)).toEqual(['/easter-plan.md', '/comms/newsletter.md']);
    expect(hits[1]?.snippet).toContain('Easter choir rehearsal');
    expect(listDirectory).not.toHaveBeenCalledWith('u1', '/pastoral-care', 'staff', 'all');
    expect(readFile).not.toHaveBeenCalledWith('u1', '/.secret.md', 'staff', 'all');
    expect(readFile).not.toHaveBeenCalledWith('u1', '/comms/logo.png', 'staff', 'all');
  });

  it('finds files by name alone', async () => {
    const { search } = makeWorkspace();
    expect(await search.search(user, 'logo')).toEqual([{ path: '/comms/logo.png', snippet: '' }]);
  });

  it('returns nothing for an empty query', async () => {
    const { search, listDirectory } = makeWorkspace();
    expect(await search.search(user, '  ,  ')).toEqual([]);
    expect(listDirectory).not.toHaveBeenCalled();
  });
});

describe('WorkspaceSearch.readText', () => {
  it('reads and caps a file', async () => {
    const { search } = makeWorkspace();
    contents['/comms/long.md'] = 'x'.repeat(MAX_READ_CHARS + 50);
    expect((await search.readText(user, '/comms/long.md')).length).toBe(MAX_READ_CHARS);
  });

  it('refuses excluded paths without touching the workspace', async () => {
    const { search, readFile } = makeWorkspace();
    await expect(search.readText(user, '/comms/../incidents/a.md')).rejects.toThrow(
      NotFoundException,
    );
    expect(readFile).not.toHaveBeenCalled();
  });

  it('refuses files without text', async () => {
    const { search } = makeWorkspace();
    await expect(search.readText(user, '/comms/logo.png')).rejects.toThrow('no readable text');
  });
});
