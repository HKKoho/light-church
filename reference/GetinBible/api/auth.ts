/**
 * Server-side sign-in (replaces the old browser-side password check).
 *
 *   POST /api/auth/login     { name, password? }            → { token, user }
 *   POST /api/auth/password  { password, email?, current? } → { user }
 *                            (Authorization: Bearer <session token>)
 *
 * Passwords are checked in the database by gib_login() / gib_set_password()
 * (sql/secure_auth.sql), which only the service_role key may call. On success
 * this issues a session JWT (role "authenticated", sub = user id) signed with
 * the Supabase JWT secret, so PostgREST/Storage row security sees who it is.
 *
 * Server env vars (never VITE_*):
 *   SUPABASE_REST_URL     PostgREST base, e.g. http://getinbible-rest:3000
 *                         (or https://<ref>.supabase.co/rest/v1)
 *   SUPABASE_SERVICE_KEY  service_role key
 *   SUPABASE_JWT_SECRET   the project's JWT secret
 *   ALLOWED_ORIGINS       (optional) comma-separated origins allowed to call this
 */

const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_BODY_BYTES = 8 * 1024;

// Brute-force guard: per name and per client address, in a sliding window.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_NAME = 10;
const MAX_FAILURES_PER_CLIENT = 50;
const failures = new Map<string, number[]>();

type Json = Record<string, unknown>;

interface DbUser {
  id: string;
  name: string;
  role: string;
  created_at: string;
  last_login: string;
  email: string | null;
  has_password: boolean;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function config() {
  const restUrl = process.env.SUPABASE_REST_URL?.replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!restUrl || !serviceKey || !jwtSecret) {
    throw new HttpError(503, 'Sign-in is not configured');
  }
  return { restUrl, serviceKey, jwtSecret };
}

function isOriginAllowed(request: Request): boolean {
  const allowed = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  const origin = request.headers.get('origin');
  return origin !== null && allowed.includes(origin);
}

async function readBody(request: Request): Promise<Json> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request too large');
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Json;
    }
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Invalid JSON');
}

function optionalString(body: Json, key: string, max: number): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > max) throw new HttpError(400, `Invalid ${key}`);
  return value;
}

// ── JWT (HS256) ──────────────────────────────────────────────────────────────
const encoder = new TextEncoder();

function b64url(bytes: Uint8Array | string): string {
  const data = typeof bytes === 'string' ? encoder.encode(bytes) : bytes;
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value: string): Uint8Array {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signSession(user: DbUser, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      role: 'authenticated',
      aud: 'authenticated',
      app_role: user.role,
      iat: now,
      exp: now + SESSION_SECONDS,
    }),
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(signature))}`;
}

/** Returns the user id from a valid, unexpired session token. */
async function verifySession(token: string, secret: string): Promise<string> {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new HttpError(401, 'Not signed in');
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    fromB64url(signature),
    encoder.encode(`${header}.${payload}`),
  );
  if (!valid) throw new HttpError(401, 'Not signed in');
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as Json;
  if (
    claims.role !== 'authenticated' ||
    typeof claims.sub !== 'string' ||
    typeof claims.exp !== 'number' ||
    claims.exp < Date.now() / 1000
  ) {
    throw new HttpError(401, 'Session expired');
  }
  return claims.sub;
}

// ── database ─────────────────────────────────────────────────────────────────
async function rpc(fn: string, args: Json): Promise<unknown> {
  const { restUrl, serviceKey } = config();
  const res = await fetch(`${restUrl}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as Json).message)
        : `Database error ${res.status}`;
    // Errors raised on purpose in gib_set_password carry a user-facing message.
    throw new HttpError(res.status >= 500 ? 502 : 400, message);
  }
  return body;
}

// ── brute-force guard ────────────────────────────────────────────────────────
function recent(key: string): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  const list = (failures.get(key) ?? []).filter((t) => t > cutoff);
  if (list.length > 0) failures.set(key, list);
  else failures.delete(key);
  return list;
}

function tooManyFailures(nameKey: string, clientKey: string): boolean {
  return (
    recent(nameKey).length >= MAX_FAILURES_PER_NAME ||
    recent(clientKey).length >= MAX_FAILURES_PER_CLIENT
  );
}

function recordFailure(...keys: string[]): void {
  for (const key of keys) failures.set(key, [...recent(key), Date.now()]);
}

function clientAddress(request: Request): string {
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// ── handlers ─────────────────────────────────────────────────────────────────
async function login(request: Request): Promise<Response> {
  const body = await readBody(request);
  const name = optionalString(body, 'name', 100)?.trim();
  const password = optionalString(body, 'password', 200);
  if (!name) throw new HttpError(400, 'Name is required');

  const nameKey = `name:${name.toLowerCase()}`;
  const clientKey = `client:${clientAddress(request)}`;
  if (tooManyFailures(nameKey, clientKey)) {
    throw new HttpError(429, 'Too many attempts — try again in 15 minutes');
  }

  const user = (await rpc('gib_login', { p_name: name, p_password: password ?? null })) as
    | DbUser
    | null;
  if (!user) {
    recordFailure(nameKey, clientKey);
    throw new HttpError(401, '密碼不正確');
  }
  return json(200, { token: await signSession(user, config().jwtSecret), user });
}

async function setPassword(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const userId = await verifySession(token, config().jwtSecret);
  const body = await readBody(request);
  const password = optionalString(body, 'password', 200);
  if (!password) throw new HttpError(400, 'Password is required');
  const user = await rpc('gib_set_password', {
    p_user_id: userId,
    p_current: optionalString(body, 'current', 200) ?? null,
    p_new: password,
    p_email: optionalString(body, 'email', 200) ?? null,
  });
  return json(200, { user });
}

const ROUTES: Record<string, (request: Request) => Promise<Response>> = {
  login,
  password: setPassword,
};

function resolvePath(request: Request): string {
  const url = new URL(request.url);
  const raw = url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/auth\/?/, '');
  return decodeURIComponent(raw).replace(/^\/+|\/+$/g, '');
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isOriginAllowed(request)) throw new HttpError(403, 'Origin not allowed');
    const handler = ROUTES[resolvePath(request)];
    if (!handler) throw new HttpError(404, 'Not found');
    return await handler(request);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: { message: error.message } });
    return json(500, { error: { message: 'Sign-in failed' } });
  }
}
