import type { ArchiveBulletinsResult } from '@clawix/shared';
import { authFetch } from '@/lib/auth';
import { TOOL_SERVER_UNAVAILABLE, type ToolFetchRequest } from './ai-tool-storage-bridge';

/**
 * Server calls a sandboxed AI Tool may make, handled by the dashboard on the
 * tool's behalf (the tool page itself has no session and no API access).
 * Keyed by tool id, then by "<METHOD> <path>". Anything not listed gets a 503.
 */

export interface ToolServerResponse {
  readonly status: number;
  readonly body: string;
  /** Short confirmation for the viewer to show, if any. */
  readonly notice?: ToolServerNotice;
}

export type ToolServerNotice = { readonly kind: 'bulletinsArchived' } & ArchiveBulletinsResult;

type Handler = (body: string | null) => Promise<ToolServerResponse>;

const unavailable = (): ToolServerResponse => ({
  status: 503,
  body: JSON.stringify({ error: TOOL_SERVER_UNAVAILABLE, message: TOOL_SERVER_UNAVAILABLE }),
});

const ARCHIVED_NOT_ANALYSED =
  '過往週刊已存檔；AI 格式分析尚未在光教會啟用。 ' +
  'Past bulletins were archived; AI format analysis is not yet enabled in Light Church.';

const ROUTES: Readonly<Record<string, Readonly<Record<string, Handler>>>> = {
  'sunday-service-bulletin': {
    // The tool sends past-bulletin PDFs here for AI analysis. Archive them in
    // Postgres (never shown in the weekly editor); analysis comes in a later
    // phase, so answer non-OK — the tool then carries on into the editor.
    'POST /api/analyze-bulletins': async (body) => {
      if (body === null) return unavailable();
      const res = await authFetch<{ success: boolean; data: ArchiveBulletinsResult }>(
        '/api/v1/bulletin-archive',
        { method: 'POST', body },
      );
      return {
        status: 503,
        body: JSON.stringify({ error: ARCHIVED_NOT_ANALYSED }),
        notice: { kind: 'bulletinsArchived', ...res.data },
      };
    },
  },
};

function routePath(url: string): string {
  const path = url.split(/[?#]/)[0] ?? '';
  return path.startsWith('/') ? path : `/${path}`;
}

export async function handleToolServerRequest(
  toolName: string,
  request: Pick<ToolFetchRequest, 'url' | 'method' | 'body'>,
): Promise<ToolServerResponse> {
  const handler = ROUTES[toolName]?.[`${request.method.toUpperCase()} ${routePath(request.url)}`];
  if (!handler) return unavailable();
  try {
    return await handler(request.body);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 502, body: JSON.stringify({ error: message, message }) };
  }
}
