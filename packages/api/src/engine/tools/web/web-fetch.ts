/**
 * Web fetch tool — fetches a URL and extracts readable content as markdown.
 *
 * Executes on the host (not in the container). Validates URLs for SSRF
 * safety before making any HTTP request. Uses undici with DNS pinning
 * to prevent DNS rebinding attacks. Extracts content via the
 * readability + turndown pipeline for HTML, pretty-prints JSON,
 * and passes through plain text.
 */
import { createLogger } from '@clawix/shared';

import type { Tool, ToolResult } from '../../tool.js';
import { safeFetchText } from './safe-fetch.js';
import { extractContent } from './content-extractor.js';

const logger = createLogger('engine:tools:web:fetch');

const DEFAULT_MAX_CHARS = 50_000;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_REDIRECTS = 5;
const USER_AGENT = 'Clawix/1.0';

/**
 * Create a web_fetch tool that fetches URLs with SSRF protection and content extraction.
 */
export function createWebFetchTool(): Tool {
  return {
    name: 'web_fetch',
    description:
      'Fetch a URL and extract readable content as markdown. Use for articles, docs, or web pages.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch',
        },
        maxChars: {
          type: 'integer',
          description: 'Maximum characters to return (default 50000)',
          minimum: 100,
        },
      },
      required: ['url'],
    },

    async execute(params: Record<string, unknown>): Promise<ToolResult> {
      const url = params['url'] as string;
      const maxChars = (params['maxChars'] as number | undefined) ?? DEFAULT_MAX_CHARS;

      logger.info({ url, maxChars }, 'web_fetch invoked');

      try {
        const response = await safeFetchText(url, {
          timeoutMs: FETCH_TIMEOUT_MS,
          maxBytes: MAX_RESPONSE_BYTES,
          maxRedirects: MAX_REDIRECTS,
          userAgent: USER_AGENT,
        });

        if (!response.ok) {
          return {
            output: `Fetch failed: HTTP ${response.status} for ${url}`,
            isError: true,
          };
        }

        // Extract content based on content type
        const { body, contentType } = response;
        const extracted = extractContent(body, contentType, maxChars);

        // Format output
        const titleLine = extracted.title
          ? `Title: ${extracted.title}\nURL: ${url}\n\n`
          : `URL: ${url}\n\n`;
        const output = titleLine + extracted.content;

        logger.info(
          {
            url,
            contentType,
            contentLength: body.length,
            extractedLength: extracted.content.length,
          },
          'web_fetch completed',
        );

        return { output, isError: false };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ url, error: message }, 'web_fetch failed');
        return { output: `Fetch failed: ${message}`, isError: true };
      }
    },
  };
}
