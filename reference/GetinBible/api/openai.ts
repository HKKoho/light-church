/**
 * Server-side OpenAI proxy (Vercel Function).
 *
 * The OpenAI API key lives ONLY in the server env var OPENAI_API_KEY and is
 * never shipped to the browser. The browser's OpenAI SDK client points its
 * baseURL at /api/openai; vercel.json rewrites /api/openai/<path> here.
 *
 * Because the endpoint is public, it only forwards the exact calls this app
 * makes (allowlisted paths, models and parameters, capped sizes) so it cannot
 * be used as a general-purpose relay for the key.
 *
 * Server env vars:
 *   OPENAI_API_KEY   (required) - the real key; do NOT prefix with VITE_
 *   ALLOWED_ORIGINS  (optional) - comma-separated origins allowed to call this,
 *                                 e.g. https://getinbible.vercel.app
 */

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const MAX_BODY_BYTES = 200 * 1024;

const CHAT_MODELS = new Set(['gpt-4o']);
const CHAT_MAX_TOKENS = 2000;
const CHAT_MAX_MESSAGES = 60;

const TTS_MODELS = new Set(['tts-1']);
const TTS_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
const TTS_MAX_INPUT_CHARS = 4096;

type Json = Record<string, unknown>;

class BadRequest extends Error {}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalNumber(body: Json, key: string, min: number, max: number): number | undefined {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequest(`Invalid ${key}`);
  }
  return value;
}

function buildChatBody(body: Json): Json {
  if (typeof body.model !== 'string' || !CHAT_MODELS.has(body.model)) {
    throw new BadRequest('Model not allowed');
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > CHAT_MAX_MESSAGES) {
    throw new BadRequest('Invalid messages');
  }
  for (const message of messages) {
    if (
      !isRecord(message) ||
      !['system', 'user', 'assistant'].includes(String(message.role)) ||
      typeof message.content !== 'string'
    ) {
      throw new BadRequest('Invalid message');
    }
  }

  // Rebuild from known fields only: drops stream, n, tools, etc.
  const out: Json = {
    model: body.model,
    messages: messages.map((m: Json) => ({ role: m.role, content: m.content })),
    max_tokens: optionalNumber(body, 'max_tokens', 1, CHAT_MAX_TOKENS) ?? 500,
  };
  for (const [key, min, max] of [
    ['temperature', 0, 2],
    ['presence_penalty', -2, 2],
    ['frequency_penalty', -2, 2],
  ] as const) {
    const value = optionalNumber(body, key, min, max);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function buildSpeechBody(body: Json): Json {
  if (typeof body.model !== 'string' || !TTS_MODELS.has(body.model)) {
    throw new BadRequest('Model not allowed');
  }
  if (typeof body.voice !== 'string' || !TTS_VOICES.has(body.voice)) {
    throw new BadRequest('Voice not allowed');
  }
  if (typeof body.input !== 'string' || body.input.length === 0 || body.input.length > TTS_MAX_INPUT_CHARS) {
    throw new BadRequest('Invalid input');
  }
  return {
    model: body.model,
    voice: body.voice,
    input: body.input,
    response_format: 'mp3',
    speed: optionalNumber(body, 'speed', 0.25, 4) ?? 1,
  };
}

const ROUTES: Record<string, (body: Json) => Json> = {
  'chat/completions': buildChatBody,
  'audio/speech': buildSpeechBody,
};

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Resolve "chat/completions" from either the rewrite's ?path= or the raw pathname. */
function resolvePath(request: Request): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('path');
  const raw = fromQuery ?? url.pathname.replace(/^\/api\/openai\/?/, '');
  return decodeURIComponent(raw).replace(/^\/+|\/+$/g, '');
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

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonError(503, 'OpenAI proxy is not configured');

  if (!isOriginAllowed(request)) return jsonError(403, 'Origin not allowed');

  const buildBody = ROUTES[resolvePath(request)];
  if (!buildBody) return jsonError(404, 'Endpoint not allowed');

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, 'Request too large');

  let upstreamBody: Json;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new BadRequest('Invalid body');
    upstreamBody = buildBody(parsed);
  } catch (error) {
    return jsonError(400, error instanceof BadRequest ? error.message : 'Invalid JSON');
  }

  const upstream = await fetch(`${OPENAI_BASE_URL}/${resolvePath(request)}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(upstreamBody),
  });

  // Pass through status/body only; never forward upstream headers verbatim.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'no-store',
    },
  });
}
