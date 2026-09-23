/**
 * Base URL for the API's WebSocket endpoints (`/ws/chat`, `/ws/talkingface`).
 *
 * Prefers NEXT_PUBLIC_WS_URL, then derives it from NEXT_PUBLIC_API_URL
 * (http→ws), so a stack that only overrides the API URL — e.g. this checkout's
 * dev compose on :3011 — can't end up with sockets on a different port. Uses
 * `||` so an empty-string env var (as compose can bake in) also falls through.
 */
export function resolveWsBase(): string {
  const explicit = process.env['NEXT_PUBLIC_WS_URL'];
  if (explicit) return explicit.replace(/\/+$/, '');
  const api = process.env['NEXT_PUBLIC_API_URL'];
  if (api) return api.replace(/^http/i, 'ws').replace(/\/+$/, '');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}
