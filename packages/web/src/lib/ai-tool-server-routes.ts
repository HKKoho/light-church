import type {
  ImportRosterResult,
  ImportSundayBulletinsResult,
  ResetSundayBulletinsResult,
  SaveSundayBulletinsResult,
  SundayBulletinList,
} from '@clawix/shared';
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

export type ToolServerNotice = { readonly kind: 'bulletinsImported' } & ImportSundayBulletinsResult;

type Handler = (body: string | null) => Promise<ToolServerResponse>;

const unavailable = (): ToolServerResponse => ({
  status: 503,
  body: JSON.stringify({ error: TOOL_SERVER_UNAVAILABLE, message: TOOL_SERVER_UNAVAILABLE }),
});

const ok = (data: unknown): ToolServerResponse => ({ status: 200, body: JSON.stringify(data) });

const BULLETINS_PATH = '/api/v1/sunday-bulletins';

const ROUTES: Readonly<Record<string, Readonly<Record<string, Handler>>>> = {
  'sunday-service-bulletin': {
    // The church's shared weekly bulletins, kept in Postgres. Archived ones
    // are never listed but stay in the database.
    'GET /api/bulletins': async () =>
      ok((await authFetch<{ data: SundayBulletinList }>(BULLETINS_PATH)).data),
    'PUT /api/bulletins': async (body) => {
      if (body === null) return unavailable();
      const res = await authFetch<{ data: SaveSundayBulletinsResult }>(BULLETINS_PATH, {
        method: 'PUT',
        body,
      });
      return ok(res.data);
    },
    'POST /api/bulletins/archive': async (body) => {
      const id = body === null ? '' : String((JSON.parse(body) as { id?: unknown }).id ?? '');
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
        return { status: 400, body: JSON.stringify({ error: 'Invalid bulletin id' }) };
      }
      await authFetch(`${BULLETINS_PATH}/${id}/archive`, { method: 'POST' });
      return ok({ archived: id });
    },
    // The tool's Reset: archives every active bulletin (kept in Postgres).
    'POST /api/bulletins/reset': async () => {
      const res = await authFetch<{ data: ResetSundayBulletinsResult }>(`${BULLETINS_PATH}/reset`, {
        method: 'POST',
      });
      return ok(res.data);
    },
    // Past-bulletin PDFs: archived in Postgres, then read by AI into
    // bulletins in the background (the tool polls GET /api/bulletins).
    'POST /api/import-bulletins': async (body) => {
      if (body === null) return unavailable();
      const res = await authFetch<{ data: ImportSundayBulletinsResult }>(
        `${BULLETINS_PATH}/import`,
        { method: 'POST', body },
      );
      return { ...ok(res.data), notice: { kind: 'bulletinsImported', ...res.data } };
    },
    // A printed duty roster (司職表) PDF, read by AI into roster schedule
    // entries; the tool keeps them itself, nothing is stored.
    'POST /api/import-roster': async (body) => {
      if (body === null) return unavailable();
      const res = await authFetch<{ data: ImportRosterResult }>(`${BULLETINS_PATH}/roster-import`, {
        method: 'POST',
        body,
      });
      return ok(res.data);
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
