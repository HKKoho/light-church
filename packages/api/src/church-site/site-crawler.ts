// packages/api/src/church-site/site-crawler.ts
//
// Breadth-first crawl of a church website: same site only, robots.txt
// honoured, HTML pages only, capped in pages, depth and size, one request at
// a time. The fetcher is injected (SSRF-safe in production, fake in tests).
import { createLogger } from '@clawix/shared';

import type { SafeFetchResult } from '../engine/tools/web/safe-fetch.js';
import { extractLinks, normalizePageUrl } from './site-extractor.js';

const logger = createLogger('church-site:crawler');

export type Fetcher = (url: string) => Promise<SafeFetchResult>;

export interface CrawlOptions {
  readonly maxPages: number;
  readonly maxDepth: number;
  /** Pause between requests, to be polite to the church's host. */
  readonly delayMs: number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export const DEFAULT_CRAWL: CrawlOptions = { maxPages: 40, maxDepth: 3, delayMs: 300 };

export interface CrawledPage {
  readonly url: string;
  readonly html: string;
  readonly depth: number;
}

export interface CrawlResult {
  /** The site's origin after redirects (e.g. https://www.cklbc.org). */
  readonly origin: string;
  /** Pages in crawl order; the first is the home page. */
  readonly pages: CrawledPage[];
}

const isHtml = (r: SafeFetchResult) => /text\/html|application\/xhtml\+xml/i.test(r.contentType);

/** `Disallow` paths from robots.txt that apply to every crawler (`User-agent: *`). */
export function parseRobots(text: string): string[] {
  const disallow: string[] = [];
  let applies = false;
  let inAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === 'user-agent') {
      applies = inAgents ? applies || value === '*' : value === '*';
      inAgents = true;
      continue;
    }
    inAgents = false;
    if (key === 'disallow' && applies && value) disallow.push(value);
  }
  return disallow;
}

const blocked = (url: string, disallow: readonly string[]) => {
  const path = new URL(url).pathname;
  return disallow.some((rule) => path.startsWith(rule.replace(/\*.*$/, '')));
};

export async function crawlSite(
  startUrl: string,
  fetcher: Fetcher,
  opts: CrawlOptions = DEFAULT_CRAWL,
): Promise<CrawlResult> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const first = await fetcher(startUrl);
  if (!first.ok) throw new Error(`The website answered HTTP ${first.status}`);
  if (!isHtml(first)) throw new Error('The address is not a web page');
  const origin = new URL(first.url).origin;
  const home = normalizePageUrl(first.url, first.url) ?? `${origin}/`;

  let disallow: string[] = [];
  try {
    const robots = await fetcher(`${origin}/robots.txt`);
    if (robots.ok) disallow = parseRobots(robots.body);
  } catch {
    // No robots.txt: everything is allowed.
  }

  const pages: CrawledPage[] = [{ url: home, html: first.body, depth: 0 }];
  const seen = new Set([home, normalizePageUrl(startUrl, startUrl) ?? startUrl]);
  const queue: { url: string; depth: number }[] = [];
  const enqueue = (html: string, url: string, depth: number) => {
    if (depth > opts.maxDepth) return;
    for (const link of extractLinks(html, url)) {
      if (seen.has(link) || blocked(link, disallow)) continue;
      seen.add(link);
      queue.push({ url: link, depth });
    }
  };
  enqueue(first.body, home, 1);

  while (queue.length > 0 && pages.length < opts.maxPages) {
    const next = queue.shift()!;
    await sleep(opts.delayMs);
    try {
      const res = await fetcher(next.url);
      // A redirect off the site (or to a file) is not one of the church's pages.
      const finalUrl = normalizePageUrl(res.url, `${origin}/`);
      if (!res.ok || !isHtml(res) || !finalUrl) continue;
      if (finalUrl !== next.url && pages.some((p) => p.url === finalUrl)) continue;
      pages.push({ url: finalUrl, html: res.body, depth: next.depth });
      enqueue(res.body, finalUrl, next.depth + 1);
    } catch (err) {
      logger.warn({ url: next.url, err: String(err) }, 'Skipped page that failed to load');
    }
  }
  logger.info({ origin, pages: pages.length, queued: queue.length }, 'Crawl finished');
  return { origin, pages };
}
