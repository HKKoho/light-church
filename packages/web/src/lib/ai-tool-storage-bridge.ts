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
 * bundled app's `/api/analyze-bulletins`) get a clear 503 JSON reply instead of
 * a cryptic network error. Server-side features such as AI calls will be wired
 * through the Light Church engine in a later phase.
 */

export const TOOL_STORAGE_MESSAGE = 'light-church:ai-tool-storage';

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
  var realFetch = window.fetch;
  if (realFetch) {
    window.fetch = function (input, init) {
      if (typeof input === 'string' && !/^(https?:|data:|blob:)/i.test(input)) {
        return Promise.resolve(new Response(
          JSON.stringify({ error: ${JSON.stringify(TOOL_SERVER_UNAVAILABLE)}, message: ${JSON.stringify(TOOL_SERVER_UNAVAILABLE)} }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ));
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
