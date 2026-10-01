// packages/api/src/help-assistant/__tests__/help-assistant.tools.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { ToolCallRequest } from '@clawix/shared';

import type { SearchProviderRegistry } from '../../engine/tools/web/search-provider.js';
import { HELP_ASSISTANT_TOOLS, runTool, type ToolDeps } from '../help-assistant.tools.js';
import type { WorkspaceSearch, WorkspaceUser } from '../workspace-search.js';

const call = (name: string, args: Record<string, unknown>): ToolCallRequest => ({
  id: 'c1',
  name,
  arguments: args,
});

function makeDeps(overrides: { webResults?: unknown[]; hits?: unknown[]; fail?: boolean } = {}) {
  const search = {
    search: vi.fn(async () => {
      if (overrides.fail) throw new Error('search down');
      return overrides.webResults ?? [{ title: 'T', url: 'https://t.org', snippet: 'S' }];
    }),
  };
  const workspace = {
    search: vi.fn(async () => overrides.hits ?? [{ path: '/comms/a.md', snippet: 'hello' }]),
    readText: vi.fn(async () => 'file text'),
  };
  const deps: ToolDeps = {
    search: search as unknown as SearchProviderRegistry,
    workspace: workspace as unknown as WorkspaceSearch,
    user: { userId: 'u1' } as WorkspaceUser,
  };
  return { deps, search, workspace };
}

describe('help assistant tools', () => {
  it('declares web, workspace search and workspace read', () => {
    expect(HELP_ASSISTANT_TOOLS.map((t) => t.name)).toEqual([
      'web_search',
      'search_workspace',
      'read_workspace_file',
    ]);
  });

  it('web_search lists results and returns them as sources', async () => {
    const { deps } = makeDeps();
    const result = await runTool(call('web_search', { query: 'lent' }), deps);
    expect(result.content).toContain('1. T\nhttps://t.org\nS');
    expect(result.sources).toEqual([{ title: 'T', url: 'https://t.org', kind: 'web' }]);
  });

  it('web_search reports no results', async () => {
    const { deps } = makeDeps({ webResults: [] });
    expect((await runTool(call('web_search', { query: 'x' }), deps)).content).toBe(
      'No web results found.',
    );
  });

  it('search_workspace lists paths with snippets', async () => {
    const { deps } = makeDeps({
      hits: [
        { path: '/a.md', snippet: 'hi' },
        { path: '/b.md', snippet: '' },
      ],
    });
    const result = await runTool(call('search_workspace', { query: 'hi' }), deps);
    expect(result.content).toBe('/a.md\n  …hi…\n/b.md');
    expect(result.sources).toEqual([]);
  });

  it('search_workspace reports no matches', async () => {
    const { deps } = makeDeps({ hits: [] });
    expect((await runTool(call('search_workspace', { query: 'x' }), deps)).content).toBe(
      'No matching workspace files.',
    );
  });

  it('read_workspace_file returns text with a workspace source', async () => {
    const { deps, workspace } = makeDeps();
    const result = await runTool(call('read_workspace_file', { path: '/comms/a.md' }), deps);
    expect(workspace.readText).toHaveBeenCalledWith({ userId: 'u1' }, '/comms/a.md');
    expect(result).toEqual({
      content: 'file text',
      sources: [{ title: 'a.md', url: '/comms/a.md', kind: 'workspace' }],
    });
  });

  it.each(['web_search', 'search_workspace', 'read_workspace_file'])(
    '%s requires its argument',
    async (name) => {
      const { deps } = makeDeps();
      expect((await runTool(call(name, { query: 3 }), deps)).content).toMatch(/is required/);
    },
  );

  it('turns failures and unknown tools into error text', async () => {
    const { deps } = makeDeps({ fail: true });
    expect((await runTool(call('web_search', { query: 'x' }), deps)).content).toBe(
      'Error: search down',
    );
    expect((await runTool(call('shell', {}), deps)).content).toBe('Error: unknown tool shell');
  });
});
