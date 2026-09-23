/**
 * Storage bridge for Phase 1 AI Tools.
 *
 * Tool pages run in a sandboxed iframe WITHOUT `allow-same-origin`, so they get
 * an opaque origin: real localStorage/sessionStorage throw, and the page can't
 * reach the dashboard's session. Many ready-made tools (e.g. RollCall) still
 * need to remember things, so before the tool's own scripts run we inject an
 * in-memory Storage stand-in, pre-filled with the user's saved snapshot. Every
 * localStorage change is posted to the parent, which persists it through
 * `PUT /api/v1/ai-tools/:name/storage`. sessionStorage is in-memory only.
 *
 * Tools have no server of their own here, so fetches to relative URLs (e.g. a
 * bundled app's `/api/analyze-bulletins`) are forwarded to the dashboard page
 * (`TOOL_FETCH_REQUEST`), which decides per tool what they may reach
 * (`lib/ai-tool-server-routes.ts`) and replies (`TOOL_FETCH_RESULT`). Anything
 * unhandled gets a clear 503 JSON reply instead of a cryptic network error.
 */

export const TOOL_STORAGE_MESSAGE = 'light-church:ai-tool-storage';

export const TOOL_FETCH_REQUEST = 'light-church:ai-tool-fetch';
export const TOOL_FETCH_RESULT = 'light-church:ai-tool-fetch-result';
const TOOL_FETCH_TIMEOUT_MS = 120_000;

export interface ToolFetchRequest {
  readonly type: typeof TOOL_FETCH_REQUEST;
  readonly id: number;
  readonly url: string;
  readonly method: string;
  readonly body: string | null;
}

export interface ToolFetchResult {
  readonly type: typeof TOOL_FETCH_RESULT;
  readonly id: number;
  readonly status: number;
  readonly body: string;
}

export function isToolFetchRequest(value: unknown): value is ToolFetchRequest {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as Partial<Record<keyof ToolFetchRequest, unknown>>;
  return (
    msg.type === TOOL_FETCH_REQUEST &&
    typeof msg.id === 'number' &&
    typeof msg.url === 'string' &&
    typeof msg.method === 'string' &&
    (msg.body === null || typeof msg.body === 'string')
  );
}

export const TOOL_SERVER_UNAVAILABLE =
  '此工具的伺服器功能（例如 AI 分析）尚未在光教會啟用。 ' +
  "This tool's server features (such as AI analysis) are not yet enabled in Light Church.";

export interface ToolStorageMessage {
  readonly type: typeof TOOL_STORAGE_MESSAGE;
  readonly data: Record<string, string>;
}

export function isToolStorageMessage(value: unknown): value is ToolStorageMessage {
  if (typeof value !== 'object' || value === null) return false;
  const msg = value as { type?: unknown; data?: unknown };
  if (msg.type !== TOOL_STORAGE_MESSAGE) return false;
  if (typeof msg.data !== 'object' || msg.data === null || Array.isArray(msg.data)) return false;
  return Object.values(msg.data).every((v) => typeof v === 'string');
}

/** JSON that is safe to embed inside an inline <script> element. */
function toInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function shimScript(snapshot: Record<string, string>): string {
  return `<script>(function () {
  var saved = ${toInlineJson(snapshot)};
  var timer = null;
  function flush() {
    clearTimeout(timer);
    timer = null;
    parent.postMessage({ type: ${JSON.stringify(TOOL_STORAGE_MESSAGE)}, data: saved }, '*');
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(flush, 300); }
  function makeStorage(store, persist) {
    var own = Object.prototype.hasOwnProperty;
    var changed = persist ? schedule : function () {};
    return {
      getItem: function (k) { k = String(k); return own.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[String(k)] = String(v); changed(); },
      removeItem: function (k) { delete store[String(k)]; changed(); },
      clear: function () { for (var k in store) if (own.call(store, k)) delete store[k]; changed(); },
      key: function (i) { var keys = Object.keys(store); return i < keys.length ? keys[i] : null; },
      get length() { return Object.keys(store).length; }
    };
  }
  try {
    Object.defineProperty(window, 'localStorage', { value: makeStorage(saved, true), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: makeStorage({}, false), configurable: true });
  } catch (e) {}
  addEventListener('pagehide', function () { if (timer) flush(); });
  var unavailable = JSON.stringify({ error: ${JSON.stringify(TOOL_SERVER_UNAVAILABLE)}, message: ${JSON.stringify(TOOL_SERVER_UNAVAILABLE)} });
  var pending = {};
  var seq = 0;
  addEventListener('message', function (e) {
    var d = e.data;
    if (e.source !== parent || !d || d.type !== ${JSON.stringify(TOOL_FETCH_RESULT)} || !pending[d.id]) return;
    pending[d.id](d);
    delete pending[d.id];
  });
  var realFetch = window.fetch;
  if (realFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string' && !/^(https?:|data:|blob:)/i.test(input)) {
        return new Promise(function (resolve) {
          var id = ++seq;
          function respond(status, body) {
            resolve(new Response(body, { status: status, headers: { 'Content-Type': 'application/json' } }));
          }
          var timeout = setTimeout(function () { delete pending[id]; respond(503, unavailable); }, ${TOOL_FETCH_TIMEOUT_MS});
          pending[id] = function (d) { clearTimeout(timeout); respond(d.status, d.body); };
          parent.postMessage({
            type: ${JSON.stringify(TOOL_FETCH_REQUEST)},
            id: id,
            url: input,
            method: String((init && init.method) || 'GET').toUpperCase(),
            body: init && typeof init.body === 'string' ? init.body : null
          }, '*');
        });
      }
      return realFetch.call(window, input, init);
    };
  }
})();</script>`;
}

/** Returns the tool HTML with the storage shim injected ahead of its own scripts. */
export function buildToolSrcDoc(html: string, snapshot: Record<string, string>): string {
  const shim = shimScript(snapshot);
  const head = /<head(\s[^>]*)?>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + shim + html.slice(at);
  }
  const htmlTag = /<html(\s[^>]*)?>/i.exec(html);
  if (htmlTag) {
    const at = htmlTag.index + htmlTag[0].length;
    return html.slice(0, at) + '<head>' + shim + '</head>' + html.slice(at);
  }
  return shim + html;
}
