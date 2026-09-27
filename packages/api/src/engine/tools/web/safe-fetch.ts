/**
 * SSRF-safe HTTP GET — shared by the agent's web_fetch tool and the church
 * website importer.
 *
 * Validates the URL (scheme + resolved IP) before connecting, pins the TCP
 * connection to the validated IP (no DNS rebinding), and enforces a timeout
 * and byte limit that stay armed while the body streams in.
 */
import { Agent, fetch as undiciFetch } from 'undici';

import { validateUrl } from './ssrf-protection.js';

export interface SafeFetchOptions {
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly maxRedirects: number;
  readonly userAgent: string;
}

export interface SafeFetchResult {
  readonly ok: boolean;
  readonly status: number;
  /** Final URL after redirects. */
  readonly url: string;
  readonly contentType: string;
  /** The body text; empty when the response is not OK. */
  readonly body: string;
}

/** Fetch `url` as text. Throws on a blocked URL, timeout or oversize body. */
export async function safeFetchText(url: string, opts: SafeFetchOptions): Promise<SafeFetchResult> {
  // Step 1: SSRF validation — resolves DNS and checks IP ranges
  const validated = await validateUrl(url);

  // Step 2: Create a DNS-pinned undici Agent to prevent DNS rebinding.
  // The Agent's connect.lookup returns the pre-validated IP, ensuring
  // the actual TCP connection goes to the same IP that passed SSRF checks.
  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, [
          {
            address: validated.resolvedIp,
            family: validated.resolvedIp.includes(':') ? 6 : 4,
          },
        ]);
      },
    },
  });

  // Step 3: Fetch with timeout, DNS pinning, and redirect limit.
  // The same controller covers both the request/headers phase AND the
  // body-read phase — slow-streaming endpoints (live-news pages, SSE,
  // long-poll) can return headers fast but stall the body, so the
  // timeout must remain armed until the body has been fully read.
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, opts.timeoutMs);

  try {
    const response = await undiciFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': opts.userAgent,
      },
      dispatcher,
      redirect: 'follow',
      maxRedirections: opts.maxRedirects,
    } as Parameters<typeof undiciFetch>[1]);

    const contentType = response.headers.get('content-type') ?? 'text/plain';
    const finalUrl = response.url || url;
    if (!response.ok) {
      return { ok: false, status: response.status, url: finalUrl, contentType, body: '' };
    }

    // Step 4: Read body with streaming size enforcement, racing
    // each chunk read against the same abort signal.
    const body = await readBodyWithLimit(response, opts.maxBytes, controller.signal);
    return { ok: true, status: response.status, url: finalUrl, contentType, body };
  } finally {
    clearTimeout(timeout);
    await dispatcher.close();
  }
}

/**
 * Read response body as text, aborting if size exceeds limit.
 *
 * Uses the response body stream to enforce size at the byte level,
 * preventing memory exhaustion from large responses.
 */
async function readBodyWithLimit(
  response: Awaited<ReturnType<typeof undiciFetch>>,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> {
  // If Content-Length is known and exceeds limit, fail fast
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Response too large: ${contentLength} bytes exceeds ${maxBytes} byte limit`);
  }

  // Stream the body and enforce byte limit
  const body = response.body as ReadableStream<Uint8Array> | null;
  if (!body) {
    throw new Error('Response body is not readable');
  }

  const reader = body.getReader();

  // Race each reader.read() against the abort signal so a server that sends
  // headers fast and then stalls the body cannot pin the loop indefinitely.
  let abortHandler: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(new Error('Body read aborted'));
      return;
    }
    abortHandler = () => reject(new Error('Body read aborted'));
    signal.addEventListener('abort', abortHandler);
  });
  // Prevent unhandled rejection warnings when the read finishes first.
  abortPromise.catch(() => {});

  try {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    let readResult = await Promise.race([reader.read(), abortPromise]);

    while (!readResult.done) {
      const chunk = readResult.value;
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`Response too large: exceeded ${maxBytes} byte limit`);
      }

      chunks.push(chunk);
      readResult = await Promise.race([reader.read(), abortPromise]);
    }

    const decoder = new TextDecoder();
    return (
      chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode()
    );
  } finally {
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
    // Always release the underlying connection — important when an abort
    // unblocks the read() race while the stream is still open.
    reader.cancel().catch(() => {});
  }
}
