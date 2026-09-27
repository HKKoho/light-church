import { describe, expect, it } from 'vitest';

import {
  dropRepeatedBlocks,
  extractLinks,
  extractMeta,
  extractNav,
  extractPage,
  normalizePageUrl,
  rewriteHref,
  urlToSlug,
} from '../site-extractor.js';
import { HOME, ORIGIN, page } from './fixtures.js';

const home = `${ORIGIN}/`;

describe('normalizePageUrl', () => {
  it('keeps same-site pages without hash or query', () => {
    expect(normalizePageUrl('/about/?x=1#top', home)).toBe(`${ORIGIN}/about/`);
    expect(normalizePageUrl('faith/', `${ORIGIN}/about/`)).toBe(`${ORIGIN}/about/faith/`);
  });

  it('rejects other sites, files, admin pages and non-web links', () => {
    for (const href of [
      'https://other.org/',
      '/files/a.pdf',
      '/wp-admin/',
      'mailto:a@b.c',
      'http://[bad',
    ]) {
      expect(normalizePageUrl(href, home)).toBeNull();
    }
  });
});

describe('urlToSlug', () => {
  it('turns the path into a slug, decoding Chinese', () => {
    expect(urlToSlug(`${ORIGIN}/about/faith/`)).toBe('about/faith');
    expect(urlToSlug(`${ORIGIN}/%e8%81%af%e7%b5%a1/`)).toBe('聯絡');
    expect(urlToSlug(`${ORIGIN}/news/item.html`)).toBe('news/item');
    expect(urlToSlug(`${ORIGIN}/a b!/`)).toBe('a-b');
  });

  it('calls the root "home"', () => {
    expect(urlToSlug(home)).toBe('home');
  });
});

describe('rewriteHref', () => {
  it('points site pages at /churchweb and leaves the rest absolute', () => {
    expect(rewriteHref('/about/', home)).toBe('/churchweb/about');
    expect(rewriteHref('/', home)).toBe('/churchweb');
    expect(rewriteHref('/files/a.pdf', home)).toBe(`${ORIGIN}/files/a.pdf`);
    expect(rewriteHref('https://youtube.com/x', home)).toBe('https://youtube.com/x');
    expect(rewriteHref('#top', home)).toBe('#top');
  });
});

describe('extractLinks', () => {
  it('lists each same-site page once', () => {
    const links = extractLinks(HOME, home);
    expect(links).toContain(`${ORIGIN}/about/faith/`);
    expect(links).toContain(`${ORIGIN}/about/history/1990/`);
    expect(links.filter((l) => l === `${ORIGIN}/about/`)).toHaveLength(1);
    expect(links.some((l) => l.includes('youtube') || l.endsWith('.pdf'))).toBe(false);
  });
});

describe('extractNav', () => {
  it('reads top-level items with flattened, de-duplicated submenus', () => {
    const nav = extractNav(HOME, home);
    expect(nav.map((i) => i.label)).toEqual(['首頁', '關於我們', '聯絡我們', '直播']);
    expect(nav[1]).toEqual({
      label: '關於我們',
      href: '/churchweb/about',
      children: [
        { label: '基本信仰', href: '/churchweb/about/faith' },
        { label: '歷史', href: '/churchweb/about/history' },
        { label: '1990', href: '/churchweb/about/history/1990' },
      ],
    });
    expect(nav[2]!.href).toBe('/churchweb/聯絡');
    expect(nav[3]!.href).toBe('https://www.youtube.com/@church');
  });

  it('returns no menu for a page without one', () => {
    expect(extractNav('<p>hi</p>', home)).toEqual([]);
  });
});

describe('extractPage', () => {
  it('keeps the main content only, as Markdown with rewritten links', () => {
    const { title, markdown } = extractPage(HOME, home);
    expect(title).toBe('首頁');
    expect(markdown).toContain('Sunday worship is at 10:30am');
    expect(markdown).toContain('[Read what we believe](/churchweb/about/faith)');
    expect(markdown).toContain(`[download the bulletin](${ORIGIN}/files/bulletin.pdf)`);
    expect(markdown).toContain(`![Banner](${ORIGIN}/wp-content/uploads/banner.jpg)`);
    expect(markdown).not.toContain('Skip to content');
    expect(markdown).not.toContain('基本信仰');
    expect(markdown).not.toContain('©');
  });

  it('falls back to the body when a page has little text', () => {
    const { markdown } = extractPage(page('Short', '<p>Hi</p>'), home);
    expect(markdown).toContain('Hi');
  });
});

describe('extractMeta', () => {
  it('finds the name, description, logo and contact links', () => {
    expect(extractMeta(HOME, home)).toEqual({
      churchName: 'Example Church',
      tagline: 'A church in the city',
      logoUrl: `${ORIGIN}/wp-content/uploads/logo.png`,
      emails: ['hello@example-church.org'],
      phones: ['+85212345678'],
    });
  });
});

describe('extractPage extras', () => {
  it('turns tables into Markdown tables', () => {
    const { markdown } = extractPage(
      page(
        'Events',
        `<table><tr><th>日期</th><th>內容</th></tr>
         <tr><td>9 月 6 日</td><td>午餐 | 分享會</td></tr><tr><td></td><td></td></tr></table>`,
      ),
      home,
    );
    expect(markdown).toContain('| 日期 | 內容 |\n| --- | --- |\n| 9 月 6 日 | 午餐 \\| 分享會 |');
  });

  it('uses Readability when the page has no content area', () => {
    const html = `<html><head><title>News | Site</title></head><body>
      <div class="sidebar"><a href="/x/">x</a></div>
      <div class="post"><h2>News</h2><p>${'The harvest festival was a joyful day. '.repeat(20)}</p></div>
    </body></html>`;
    const { title, markdown } = extractPage(html, home);
    expect(title).toBe('News');
    expect(markdown).toContain('The harvest festival was a joyful day.');
  });
});

describe('dropRepeatedBlocks', () => {
  it('drops a block repeating the previous one, ignoring heading level', () => {
    expect(dropRepeatedBlocks('# Hi\n\n## Hi\n\nText\n\n\n\nText\n\nHi')).toBe(
      '# Hi\n\nText\n\nHi',
    );
  });
});

describe('extractMeta fallbacks', () => {
  it('shortens a doubled site name and drops a dumped description', () => {
    const html = `<html><head><title>Home</title>
      <meta property="og:site_name" content="茶果嶺浸信會 CKLBC - 茶果嶺浸信會 Cha Kwo Ling Baptist Church">
      <meta name="description" content="${'認識茶浸 主日崇拜直播 '.repeat(20)}">
      </head><body></body></html>`;
    const meta = extractMeta(html, home);
    expect(meta.churchName).toBe('茶果嶺浸信會 CKLBC');
    expect(meta.tagline).toBe('');
  });
});
