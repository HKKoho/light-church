/**
 * Get in Bible — self-hosted runtime.
 *
 * Replaces Vercel for reference/GetinBible: serves the built Vite SPA from
 * ./dist (with index.html fallback for client-side routes) and runs the
 * app's own api/*.ts proxies, which keep the OpenAI / Gemini / Google TTS
 * keys server-side. Also forwards /rest/v1 and /storage/v1 to the local
 * Supabase services (PostgREST + Storage), as Supabase's Kong gateway does,
 * so the app reaches its database on its own origin. Bundled with esbuild at
 * image build time.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { POST as auth } from '../../../reference/GetinBible/api/auth.js';
import { POST as gemini } from '../../../reference/GetinBible/api/gemini.js';
import { POST as openai } from '../../../reference/GetinBible/api/openai.js';
import { POST as tts } from '../../../reference/GetinBible/api/tts.js';

const PORT = Number(process.env.PORT ?? 3005);
const DIST = resolve(process.env.DIST_DIR ?? './dist');

/** Path prefix → upstream base URL; the prefix is stripped, like Kong's strip_path. */
const SUPABASE_UPSTREAMS: readonly (readonly [string, string | undefined])[] = [
  ['/rest/v1', process.env.SUPABASE_REST_URL],
  ['/storage/v1', process.env.SUPABASE_STORAGE_URL],
];

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function proxySupabase(
  prefix: string,
  upstream: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const incoming = new URL(req.url ?? '/', 'http://localhost');
  const target = new URL(upstream);
  const headers: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined && !HOP_BY_HOP.has(key)) headers[key] = value;
  }
  headers['x-forwarded-host'] = req.headers.host ?? '';
  headers['x-forwarded-proto'] = String(req.headers['x-forwarded-proto'] ?? 'http');
  headers['x-forwarded-prefix'] = prefix;

  const upstreamReq = httpRequest(
    {
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: (incoming.pathname.slice(prefix.length) || '/') + incoming.search,
      headers,
    },
    (upstreamRes) => {
      const outHeaders: Record<string, string | string[]> = {};
      for (const [key, value] of Object.entries(upstreamRes.headers)) {
        if (value !== undefined && !HOP_BY_HOP.has(key)) outHeaders[key] = value;
      }
      res.writeHead(upstreamRes.statusCode ?? 502, outHeaders);
      upstreamRes.pipe(res);
    },
  );
  upstreamReq.on('error', (error) => {
    process.stderr.write(`getinbible: supabase ${prefix}: ${String(error)}\n`);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'Database service unavailable' }));
  });
  req.pipe(upstreamReq);
}

const API: Record<string, (request: Request) => Promise<Response>> = {
  auth,
  openai,
  gemini,
  tts,
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

function toRequest(req: IncomingMessage): Request {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  // Client address for the sign-in brute-force guard; never trust the caller's copy.
  headers.set('x-real-ip', req.socket.remoteAddress ?? 'unknown');
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined,
    // Required by Node's fetch when streaming a request body.
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body as import('node:stream/web').ReadableStream).pipe(res);
}

async function handleApi(name: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const handler = API[name];
  if (!handler) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found' } }));
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST', 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Method not allowed' } }));
    return;
  }
  await sendResponse(res, await handler(toRequest(req)));
}

async function serveFile(res: ServerResponse, filePath: string, immutable: boolean) {
  const info = await stat(filePath);
  res.writeHead(200, {
    'content-type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': info.size,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(filePath).pipe(res);
}

async function handleStatic(pathname: string, res: ServerResponse): Promise<void> {
  const decoded = decodeURIComponent(pathname);
  const candidate = normalize(join(DIST, decoded));
  // Block path traversal out of dist/.
  if (candidate.startsWith(DIST)) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) {
        await serveFile(res, candidate, decoded.startsWith('/assets/'));
        return;
      }
    } catch {
      // fall through to the SPA shell
    }
  }
  // Missing hashed assets are real 404s; everything else is a client route.
  if (decoded.startsWith('/assets/')) {
    res.writeHead(404).end();
    return;
  }
  await serveFile(res, join(DIST, 'index.html'), false);
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  for (const [prefix, upstream] of SUPABASE_UPSTREAMS) {
    if (upstream && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      proxySupabase(prefix, upstream, req, res);
      return;
    }
  }
  const api = /^\/api\/([^/]+)/.exec(pathname);
  const work = api?.[1] ? handleApi(api[1], req, res) : handleStatic(pathname, res);
  work.catch((error: unknown) => {
    process.stderr.write(`getinbible: ${String(error)}\n`);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Internal server error');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`getinbible listening on :${PORT}\n`);
});
