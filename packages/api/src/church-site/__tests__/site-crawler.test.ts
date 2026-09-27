import { describe, expect, it, vi } from 'vitest';

import type { SafeFetchResult } from '../../engine/tools/web/safe-fetch.js';
import { crawlSite, parseRobots, type CrawlOptions } from '../site-crawler.js';
import { HOME, ORIGIN, page } from './fixtures.js';

const OPTS: CrawlOptions = { maxPages: 40, maxDepth: 3, delayMs: 0, sleep: async () => {} };

const html = (url: string, body: string): SafeFetchResult => ({
  ok: true,
  status: 200,
  url,
  contentType: 'text/html; charset=utf-8',
  body,
});

/** A fake site: path → response. Unknown paths are 404s. */
function fakeSite(routes: Record<string, string | SafeFetchResult>) {
  return vi.fn(async (url: string): Promise<SafeFetchResult> => {
    const path = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : url;
    const route = routes[path];
    if (route === undefined) return { ok: false, status: 404, url, contentType: '', body: '' };
    return typeof route === 'string' ? html(url, route) : route;
  });
}

const SITE = {
  '/': HOME,
  '/about/': page('About', '<p>About us</p>'),
  '/about/faith/': page('Faith', '<p>We believe</p>'),
  '/about/history/': page('History', '<p>Since 1970</p>'),
  '/about/history/1990/': page('1990', '<p>New hall</p>'),
  '/聯絡/': page('Contact', '<p>Call us</p>'),
  '/%E8%81%AF%E7%B5%A1/': page('Contact', '<p>Call us</p>'),
  '/robots.txt': { ok: true, status: 200, url: '', contentType: 'text/plain', body: '' },
};

describe('parseRobots', () => {
  it('collects Disallow rules for all crawlers only', () => {
    const text = `User-agent: Googlebot\nDisallow: /g/\n\nUser-agent: *\nDisallow: /wp-admin/\nDisallow: /private # note\nAllow: /x\nDisallow:\n`;
    expect(parseRobots(text)).toEqual(['/wp-admin/', '/private']);
  });

  it('handles a group naming several agents', () => {
    expect(parseRobots('User-agent: bot\nUser-agent: *\nDisallow: /a')).toEqual(['/a']);
  });
});

describe('crawlSite', () => {
  it('crawls same-site pages breadth first, home first', async () => {
    const fetcher = fakeSite(SITE);
    const { origin, pages } = await crawlSite(`${ORIGIN}/`, fetcher, OPTS);
    expect(origin).toBe(ORIGIN);
    expect(pages[0]).toMatchObject({ url: `${ORIGIN}/`, depth: 0 });
    expect(pages.map((p) => p.url)).toContain(`${ORIGIN}/about/history/1990/`);
    expect(fetcher.mock.calls.some(([u]) => u.includes('youtube') || u.endsWith('.pdf'))).toBe(
      false,
    );
  });

  it('follows the redirect to the real origin', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url === 'https://example-church.org'
        ? html(`${ORIGIN}/`, page('Home', '<p>Hi</p>'))
        : { ok: false, status: 404, url, contentType: '', body: '' },
    );
    const { origin, pages } = await crawlSite('https://example-church.org', fetcher, OPTS);
    expect(origin).toBe(ORIGIN);
    expect(pages).toHaveLength(1);
  });

  it('honours robots.txt, page and depth limits', async () => {
    const robots = { ...SITE, '/robots.txt': html('', 'User-agent: *\nDisallow: /about/history') };
    robots['/robots.txt'].contentType = 'text/plain';
    const blocked = await crawlSite(`${ORIGIN}/`, fakeSite(robots), OPTS);
    expect(blocked.pages.some((p) => p.url.includes('/about/history'))).toBe(false);

    const capped = await crawlSite(`${ORIGIN}/`, fakeSite(SITE), { ...OPTS, maxPages: 2 });
    expect(capped.pages).toHaveLength(2);

    const shallow = await crawlSite(`${ORIGIN}/`, fakeSite(SITE), { ...OPTS, maxDepth: 0 });
    expect(shallow.pages).toHaveLength(1);
  });

  it('skips pages that fail, are not HTML or redirect off the site', async () => {
    const fetcher = fakeSite({
      ...SITE,
      '/about/': {
        ok: true,
        status: 200,
        url: `${ORIGIN}/about/`,
        contentType: 'application/pdf',
        body: '',
      },
      '/about/faith/': html('https://evil.example/', page('x', '<p>x</p>')),
    });
    fetcher.mockImplementationOnce(async (u) => html(u, HOME));
    fetcher.mockImplementationOnce(async () => {
      throw new Error('no robots');
    });
    const { pages } = await crawlSite(`${ORIGIN}/`, fetcher, OPTS);
    const urls = pages.map((p) => p.url);
    expect(urls).not.toContain(`${ORIGIN}/about/`);
    expect(urls).not.toContain(`${ORIGIN}/about/faith/`);
    expect(urls).not.toContain('https://evil.example/');
  });

  it('keeps going when one page throws', async () => {
    const fetcher = fakeSite(SITE);
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (url) => {
      if (url.endsWith('/about/')) throw new Error('timeout');
      return base(url);
    });
    const { pages } = await crawlSite(`${ORIGIN}/`, fetcher, OPTS);
    expect(pages.map((p) => p.url)).toContain(`${ORIGIN}/about/faith/`);
  });

  it('fails when the start page is not a working web page', async () => {
    await expect(crawlSite(`${ORIGIN}/nope`, fakeSite(SITE), OPTS)).rejects.toThrow('HTTP 404');
    const text = fakeSite({ '/': { ...html(`${ORIGIN}/`, 'x'), contentType: 'text/plain' } });
    await expect(crawlSite(`${ORIGIN}/`, text, OPTS)).rejects.toThrow('not a web page');
  });
});
