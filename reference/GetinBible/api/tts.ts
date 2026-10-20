/**
 * Server-side Google Cloud Text-to-Speech proxy (Vercel Function).
 *
 * The key lives ONLY in the server env var GOOGLE_CLOUD_TTS_API_KEY and is
 * never shipped to the browser. services/googleCloudTTSService.ts POSTs the
 * text:synthesize request body to /api/tts.
 *
 * Because the endpoint is public, it only forwards Cantonese (yue-HK)
 * synthesis with the app's voices and Google's input size limit.
 *
 * Server env vars:
 *   GOOGLE_CLOUD_TTS_API_KEY (required) - the real key; do NOT prefix with VITE_
 *   ALLOWED_ORIGINS          (optional) - comma-separated origins allowed to call this
 */

const TTS_API_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const MAX_BODY_BYTES = 32 * 1024;
const MAX_INPUT_BYTES = 5000; // Google's per-request limit

const LANGUAGE_CODE = 'yue-HK';
const ALLOWED_VOICES = new Set(['yue-HK-Standard-A', 'yue-HK-Standard-B', 'yue-HK-Standard-C', 'yue-HK-Standard-D']);
const ALLOWED_ENCODINGS = new Set(['LINEAR16', 'MP3', 'OGG_OPUS']);

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

function buildBody(body: Json): Json {
  const { input, voice, audioConfig } = body;
  if (!isRecord(input) || typeof input.text !== 'string' || input.text.length === 0) {
    throw new BadRequest('Invalid input');
  }
  if (new TextEncoder().encode(input.text).length > MAX_INPUT_BYTES) {
    throw new BadRequest('Input too long');
  }
  if (!isRecord(voice) || voice.languageCode !== LANGUAGE_CODE || !ALLOWED_VOICES.has(String(voice.name))) {
    throw new BadRequest('Voice not allowed');
  }
  if (!isRecord(audioConfig) || !ALLOWED_ENCODINGS.has(String(audioConfig.audioEncoding))) {
    throw new BadRequest('Invalid audioConfig');
  }

  // Rebuild from known fields only.
  const outAudioConfig: Json = { audioEncoding: audioConfig.audioEncoding };
  for (const [key, min, max] of [
    ['sampleRateHertz', 8000, 48000],
    ['speakingRate', 0.25, 4],
    ['pitch', -20, 20],
  ] as const) {
    const value = optionalNumber(audioConfig, key, min, max);
    if (value !== undefined) outAudioConfig[key] = value;
  }
  return {
    input: { text: input.text },
    voice: { languageCode: LANGUAGE_CODE, name: voice.name },
    audioConfig: outAudioConfig,
  };
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { code: status, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
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
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
  if (!apiKey) return jsonError(503, 'TTS proxy is not configured');

  if (!isOriginAllowed(request)) return jsonError(403, 'Origin not allowed');

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

  // Key goes in a header, not the URL, so it never lands in request logs.
  const upstream = await fetch(TTS_API_ENDPOINT, {
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
