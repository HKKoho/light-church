/**
 * Server-side Gemini proxy (Vercel Function).
 *
 * The Gemini API key lives ONLY in the server env var GEMINI_API_KEY and is
 * never shipped to the browser. The browser's @google/genai client sets
 * httpOptions.baseUrl to /api/gemini; vercel.json rewrites
 * /api/gemini/<path> here, e.g. v1beta/models/gemini-2.5-flash:generateContent.
 *
 * Because the endpoint is public, it only forwards generateContent calls for
 * the models this app uses, with capped output and request size, and only the
 * Google Search tool.
 *
 * Server env vars:
 *   GEMINI_API_KEY   (required) - the real key; do NOT prefix with VITE_
 *   ALLOWED_ORIGINS  (optional) - comma-separated origins allowed to call this
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
// Vercel caps request bodies at 4.5 MB; multimodal uploads arrive base64-encoded.
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_TOKENS = 8192;

const ALLOWED_MODELS = new Set([
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-tts',
]);
const PATH_PATTERN = /^v1beta\/models\/([\w.-]+):generateContent$/;

type Json = Record<string, unknown>;

class BadRequest extends Error {}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildBody(body: Json): Json {
  if (!Array.isArray(body.contents) || body.contents.length === 0) {
    throw new BadRequest('Invalid contents');
  }

  const tools = body.tools;
  if (tools !== undefined) {
    const onlyGoogleSearch =
      Array.isArray(tools) &&
      tools.every((tool) => isRecord(tool) && Object.keys(tool).length === 1 && 'googleSearch' in tool);
    if (!onlyGoogleSearch) throw new BadRequest('Tool not allowed');
  }

  const generationConfig: Json = isRecord(body.generationConfig) ? { ...body.generationConfig } : {};
  const requested = generationConfig.maxOutputTokens;
  if (requested !== undefined && (typeof requested !== 'number' || requested < 1 || requested > MAX_OUTPUT_TOKENS)) {
    throw new BadRequest('Invalid maxOutputTokens');
  }
  generationConfig.maxOutputTokens = requested ?? MAX_OUTPUT_TOKENS;
  delete generationConfig.candidateCount;

  // Rebuild from known fields only: drops cachedContent, toolConfig, etc.
  const out: Json = { contents: body.contents, generationConfig };
  if (body.systemInstruction !== undefined) out.systemInstruction = body.systemInstruction;
  if (tools !== undefined) out.tools = tools;
  return out;
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { code: status, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Resolve "v1beta/models/x:generateContent" from either the rewrite's ?path= or the raw pathname. */
function resolvePath(request: Request): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('path');
  const raw = fromQuery ?? url.pathname.replace(/^\/api\/gemini\/?/, '');
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError(503, 'Gemini proxy is not configured');

  if (!isOriginAllowed(request)) return jsonError(403, 'Origin not allowed');

  const path = resolvePath(request);
  const model = PATH_PATTERN.exec(path)?.[1];
  if (!model) return jsonError(404, 'Endpoint not allowed');
  if (!ALLOWED_MODELS.has(model)) return jsonError(400, 'Model not allowed');

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

  const upstream = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(upstreamBody),
  });

  // Pass through status/body only; never forward upstream headers verbatim.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}
