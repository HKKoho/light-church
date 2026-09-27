// packages/api/src/church-site/site-extractor.ts
//
// Turns a church website's HTML into Light Church site data: the main menu,
// each page's content as Markdown (links rewritten to /churchweb/<slug>,
// images made absolute), and basic site facts (name, logo, email, phones).
// Pure functions over jsdom — no network.
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { CHURCH_SITE_BASE, type SiteNavItem } from '@clawix/shared';

/** Links to these are files, not pages: never crawled, always linked to the original. */
const FILE_EXT =
  /\.(pdf|docx?|xlsx?|pptx?|zip|rar|jpe?g|png|gif|webp|svg|mp3|m4a|wav|mp4|mov|ics|xml|rss|txt)$/i;

/** Site chrome removed before extracting a page's main content. */
const CHROME_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'form',
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.skip-link',
  '.screen-reader-text',
  '#wpadminbar',
].join(',');

/** Where most CMSs put a page's main content, best first. */
const CONTENT_SELECTORS = ['main', 'article', '#primary', '#content', '.entry-content', '.content'];

const MAX_NAV_ITEMS = 20;
const MAX_NAV_CHILDREN = 30;

/**
 * A page on the same site as `base` (the linking page's URL), without hash or
 * query — e.g. https://www.cklbc.org/about/ — or null for files and other sites.
 */
export function normalizePageUrl(href: string, base: string): string | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.origin !== new URL(base).origin || !/^https?:$/.test(url.protocol)) return null;
  if (FILE_EXT.test(url.pathname)) return null;
  if (/^\/(wp-admin|wp-login|wp-json|feed|xmlrpc)/.test(url.pathname)) return null;
  return `${url.origin}${url.pathname}`;
}

/** The page's path under /churchweb: "about/faith", or "home" for the site root. */
export function urlToSlug(pageUrl: string): string {
  let path = new URL(pageUrl).pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep the encoded path
  }
  const slug = path
    .split('/')
    .map((seg) => seg.replace(/\.(html?|php|aspx?)$/i, '').replace(/[^\p{L}\p{N}_-]+/gu, '-'))
    .map((seg) => seg.replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
  return slug || 'home';
}

/** Where a link on the page at `base` should point on the Light Church site. */
export function rewriteHref(href: string, base: string): string {
  if (href.startsWith('#')) return href;
  const page = normalizePageUrl(href, base);
  if (!page) {
    try {
      return new URL(href, base).href;
    } catch {
      return href;
    }
  }
  const slug = urlToSlug(page);
  return slug === 'home' ? CHURCH_SITE_BASE : `${CHURCH_SITE_BASE}/${slug}`;
}

function parse(html: string, url: string): Document {
  return new JSDOM(html, { url }).window.document;
}

/** Every same-origin page linked from the document (menu included), for crawling. */
export function extractLinks(html: string, url: string): string[] {
  const doc = parse(html, url);
  const links = new Set<string>();
  for (const a of doc.querySelectorAll('a[href]')) {
    const page = normalizePageUrl(a.getAttribute('href') ?? '', url);
    if (page) links.add(page);
  }
  return [...links];
}

const linkText = (a: Element | null) => (a?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** The main menu: top-level items with their (flattened) submenu links. */
export function extractNav(html: string, url: string): SiteNavItem[] {
  const doc = parse(html, url);
  const navs = [...doc.querySelectorAll('nav, [role="navigation"]')];
  // The primary menu is usually the nav with the most links.
  const nav =
    navs.sort((a, b) => b.querySelectorAll('a').length - a.querySelectorAll('a').length)[0] ??
    doc.querySelector('header');
  const list = nav?.querySelector('ul');
  if (!list) return [];

  const items: SiteNavItem[] = [];
  for (const li of list.querySelectorAll(':scope > li')) {
    const a = li.querySelector('a');
    const label = linkText(a);
    if (!a || !label) continue;
    const href = rewriteHref(a.getAttribute('href') ?? '', url);
    const seen = new Set([href]);
    const children = [];
    for (const child of li.querySelectorAll('ul a')) {
      const childHref = rewriteHref(child.getAttribute('href') ?? '', url);
      const childLabel = linkText(child);
      if (!childLabel || seen.has(childHref)) continue;
      seen.add(childHref);
      children.push({ label: childLabel.slice(0, 80), href: childHref });
    }
    items.push({
      label: label.slice(0, 80),
      href,
      children: children.slice(0, MAX_NAV_CHILDREN),
    });
    if (items.length >= MAX_NAV_ITEMS) break;
  }
  return items;
}

function makeTurndown(base: string): TurndownService {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  td.addRule('siteLinks', {
    filter: (node) => node.nodeName === 'A' && !!node.getAttribute('href'),
    replacement: (content, node) => {
      const text = content.trim();
      if (!text) return '';
      const href = rewriteHref((node as Element).getAttribute('href') ?? '', base);
      return href.startsWith('#') ? text : `[${text}](${href})`;
    },
  });
  td.addRule('absoluteImages', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const src = img.getAttribute('data-src') ?? img.getAttribute('src') ?? '';
      if (!src || src.startsWith('data:')) return '';
      const alt = (img.getAttribute('alt') ?? '').replace(/[[\]]/g, '');
      return `![${alt}](${new URL(src, base).href})`;
    },
  });
  td.addRule('tables', {
    filter: 'table',
    replacement: (_content, node) => `\n\n${tableToMarkdown(node as HTMLTableElement)}\n\n`,
  });
  return td;
}

const cellText = (cell: Element) =>
  (cell.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');

/** A GFM table (first row as header); cell formatting is flattened to text. */
function tableToMarkdown(table: HTMLTableElement): string {
  const rows = [...table.querySelectorAll('tr')]
    .map((tr) => [...tr.querySelectorAll('th, td')].map(cellText))
    .filter((cells) => cells.some(Boolean));
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (cells: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
  return [line(rows[0]!), line(Array<string>(width).fill('---')), ...rows.slice(1).map(line)].join(
    '\n',
  );
}

/** The page's own title: "About - Site name" / "About | Site name" → "About". */
function pageTitle(doc: Document): string {
  const og = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const h1 = linkText(doc.querySelector('h1'));
  const raw = (og || doc.title || h1).trim();
  const first = raw.split(/\s+[-|–—]\s+/)[0]?.trim();
  return (first || h1 || 'Untitled').slice(0, 200);
}

export interface ExtractedPage {
  readonly title: string;
  readonly markdown: string;
}

/** A page's main content as Markdown, without the site's menu, header and footer. */
export function extractPage(html: string, url: string): ExtractedPage {
  const doc = parse(html, url);
  const title = pageTitle(doc);
  for (const el of doc.querySelectorAll(CHROME_SELECTORS)) el.remove();

  // A CMS content area is converted whole: page builders (Elementor, Wix…)
  // split a home page into many small blocks, and Readability would keep only
  // the densest one. Without a content area, let Readability find the article.
  const root = CONTENT_SELECTORS.map((sel) => doc.querySelector(sel)).find(
    (el) => (el?.textContent ?? '').trim().length > 0,
  );
  let content = root?.innerHTML ?? '';
  if (!root) {
    const article = new Readability(doc.cloneNode(true) as Document, { charThreshold: 50 }).parse();
    content = article?.content?.trim() ? article.content : doc.body.innerHTML;
  }
  const markdown = dropRepeatedBlocks(
    makeTurndown(url).turndown(parse(`<body>${content}</body>`, url).body),
  );
  return { title, markdown };
}

/**
 * Page builders often render a block twice (desktop and mobile versions):
 * drop a paragraph that repeats the one before it, ignoring heading level.
 */
export function dropRepeatedBlocks(markdown: string): string {
  const key = (block: string) => block.replace(/^#+\s*/, '').trim();
  const blocks = markdown.split(/\n{2,}/).filter((b) => b.trim());
  return blocks
    .filter((block, i) => i === 0 || key(block) !== key(blocks[i - 1]!))
    .join('\n\n')
    .trim();
}

function siteNameOf(doc: Document): string {
  const og = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (og) return og.trim();
  const parts = doc.title.split(/\s+[-|–—]\s+/);
  return (parts.length > 1 ? parts[parts.length - 1] : doc.title)?.trim() ?? '';
}

/** Longer than this, a meta description is usually page text dumped by an SEO plugin. */
const MAX_TAGLINE = 160;

function shortDescription(doc: Document): string {
  const text = (
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ??
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ??
    ''
  ).trim();
  return text.length <= MAX_TAGLINE ? text : '';
}

export interface SiteMeta {
  readonly churchName: string;
  readonly tagline: string;
  readonly logoUrl: string;
  readonly emails: string[];
  readonly phones: string[];
}

/** Facts any page's markup gives away: name, description, logo, mailto/tel links. */
export function extractMeta(html: string, url: string): SiteMeta {
  const doc = parse(html, url);
  const logo =
    doc.querySelector(
      '.custom-logo, .site-logo img, header img[src*="logo" i], img[alt*="logo" i]',
    ) ?? doc.querySelector('header img');
  const logoSrc = logo?.getAttribute('src') ?? '';
  const pick = (prefix: string) => [
    ...new Set(
      [...doc.querySelectorAll(`a[href^="${prefix}"]`)]
        .map((a) => decodeURIComponent((a.getAttribute('href') ?? '').slice(prefix.length)))
        .map((v) => v.split('?')[0]!.trim())
        .filter(Boolean),
    ),
  ];
  return {
    // "Name - Longer name" (common in site_name) → the first, shorter form.
    churchName: (siteNameOf(doc).split(/\s+[-|–—]\s+/)[0] ?? '').trim().slice(0, 120),
    tagline: shortDescription(doc),
    logoUrl: logoSrc && !logoSrc.startsWith('data:') ? new URL(logoSrc, url).href : '',
    emails: pick('mailto:').slice(0, 5),
    phones: pick('tel:').slice(0, 5),
  };
}
