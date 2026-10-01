// packages/api/src/help-assistant/help-assistant.tools.ts
//
// The three tools the Help Assistant can call. Each returns plain text for the
// model plus the sources to show the user under the reply.
import {
  createLogger,
  type HelpAssistantSource,
  type ToolCallRequest,
  type ToolDefinition,
} from '@clawix/shared';

import type { SearchProviderRegistry } from '../engine/tools/web/search-provider.js';
import type { WorkspaceSearch, WorkspaceUser } from './workspace-search.js';

const logger = createLogger('help-assistant:tools');

const WEB_RESULTS = 5;

export const HELP_ASSISTANT_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'web_search',
    description:
      'Search the web. Use for current events, facts, Bible study background, or anything to look up online.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'search_workspace',
    description:
      "Find files in the church workspace the user can access, by words in the file name or text. Returns paths and short snippets. Some folders with members' personal data are never searched.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words that should all appear in the file' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_workspace_file',
    description:
      'Read the text of one workspace file, e.g. to summarize it. Use a path returned by search_workspace.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Workspace path, e.g. /comms/news.md' } },
      required: ['path'],
    },
  },
];

export interface ToolResult {
  readonly content: string;
  readonly sources: readonly HelpAssistantSource[];
}

export interface ToolDeps {
  readonly search: SearchProviderRegistry;
  readonly workspace: WorkspaceSearch;
  readonly user: WorkspaceUser;
}

function stringArg(call: ToolCallRequest, key: string): string {
  const value = call.arguments[key];
  return typeof value === 'string' ? value.trim() : '';
}

export async function runTool(call: ToolCallRequest, deps: ToolDeps): Promise<ToolResult> {
  try {
    switch (call.name) {
      case 'web_search': {
        const query = stringArg(call, 'query');
        if (!query) return { content: 'Error: query is required', sources: [] };
        const results = await deps.search.search(query, WEB_RESULTS);
        if (results.length === 0) return { content: 'No web results found.', sources: [] };
        return {
          content: results
            .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.snippet}`)
            .join('\n\n'),
          sources: results.map((r) => ({ title: r.title, url: r.url, kind: 'web' as const })),
        };
      }
      case 'search_workspace': {
        const query = stringArg(call, 'query');
        if (!query) return { content: 'Error: query is required', sources: [] };
        const hits = await deps.workspace.search(deps.user, query);
        if (hits.length === 0) return { content: 'No matching workspace files.', sources: [] };
        return {
          content: hits.map((h) => `${h.path}${h.snippet ? `\n  …${h.snippet}…` : ''}`).join('\n'),
          sources: [],
        };
      }
      case 'read_workspace_file': {
        const filePath = stringArg(call, 'path');
        if (!filePath) return { content: 'Error: path is required', sources: [] };
        const text = await deps.workspace.readText(deps.user, filePath);
        return {
          content: text,
          sources: [
            { title: filePath.split('/').pop() ?? filePath, url: filePath, kind: 'workspace' },
          ],
        };
      }
      default:
        return { content: `Error: unknown tool ${call.name}`, sources: [] };
    }
  } catch (err) {
    logger.warn({ err, tool: call.name }, 'Help Assistant tool failed');
    const message = err instanceof Error ? err.message : 'failed';
    return { content: `Error: ${message}`, sources: [] };
  }
}
