// packages/api/src/church-site/church-site-import.service.ts
//
// Imports the church's existing website into /churchweb: crawl it, turn each
// page into Markdown, read the menu and contact facts, and save it all. Runs
// in the background; the dashboard polls the site's importStatus.
import { ConflictException, Injectable } from '@nestjs/common';
import { createLogger } from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { ChurchSiteRepository } from '../db/church-site.repository.js';
import { OneShotLlmService } from '../engine/one-shot/one-shot-llm.service.js';
import { safeFetchText } from '../engine/tools/web/safe-fetch.js';
import { assertSiteAdmin, type Actor } from './church-site.roles.js';
import { crawlSite, type CrawlResult } from './site-crawler.js';
import { extractMeta, extractNav, extractPage, urlToSlug } from './site-extractor.js';
import { buildProfile } from './site-profile.js';

const logger = createLogger('church-site:import');

const FETCH = {
  timeoutMs: 10_000,
  maxBytes: 2 * 1024 * 1024,
  maxRedirects: 5,
  userAgent: 'LightChurch-SiteImport/1.0',
};

/** Pages most likely to hold the church's service times and contact details. */
const PROFILE_PAGE = /contact|about|visit|worship|聯絡|聯繫|關於|崇拜|聚會/i;

export interface ImportSummary {
  readonly pages: number;
  readonly skippedEdited: number;
}

@Injectable()
export class ChurchSiteImportService {
  /** Replaced in tests; production crawls through the SSRF-safe fetcher. */
  crawl: (url: string) => Promise<CrawlResult> = (url) =>
    crawlSite(url, (u) => safeFetchText(u, FETCH));

  /** The in-flight import, so tests (and shutdown) can await it. */
  running: Promise<void> | null = null;

  constructor(
    private readonly repo: ChurchSiteRepository,
    private readonly llm: OneShotLlmService,
    private readonly audit: AuditLogRepository,
  ) {}

  async start(url: string, actor: Actor): Promise<void> {
    assertSiteAdmin(actor);
    if (!(await this.repo.claimImport(url))) {
      throw new ConflictException('An import is already running');
    }
    await this.audit.create({
      userId: actor.id,
      action: 'church-site.import',
      resource: 'church-site',
      resourceId: 'default',
      details: { url },
    });
    this.running = this.run(url, actor.id).finally(() => {
      this.running = null;
    });
  }

  private async run(url: string, userId: string): Promise<void> {
    try {
      const summary = await this.importSite(url, userId);
      logger.info({ url, ...summary }, 'Church website imported');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ url, err: message }, 'Church website import failed');
      await this.repo.updateSite({ importStatus: 'failed', importError: message.slice(0, 500) });
    }
  }

  async importSite(url: string, userId: string): Promise<ImportSummary> {
    const { pages } = await this.crawl(url);
    const home = pages[0];
    if (!home) throw new Error('No pages found');

    const extracted = pages.map((p, i) => ({
      ...extractPage(p.html, p.url),
      slug: urlToSlug(p.url),
      sourceUrl: p.url,
      sortOrder: i,
    }));

    let skippedEdited = 0;
    for (const page of extracted) {
      const existing = await this.repo.findPageBySlug(page.slug);
      if (existing?.editedAt) {
        skippedEdited++;
        continue;
      }
      const data = {
        title: page.title,
        markdown: page.markdown,
        sourceUrl: page.sourceUrl,
        sortOrder: page.sortOrder,
      };
      if (existing) await this.repo.updatePage(existing.id, data);
      else await this.repo.createPage({ ...data, slug: page.slug, visibility: 'public' });
    }

    const meta = extractMeta(home.html, home.url);
    const profilePages = [
      extracted[0]!,
      ...extracted
        .slice(1)
        .filter((p) => PROFILE_PAGE.test(`${p.slug} ${p.title}`))
        .slice(0, 3),
    ];
    const profile = await buildProfile(meta, profilePages, this.llm, userId);

    await this.repo.updateSite({
      churchName: profile.churchName,
      tagline: profile.tagline,
      logoUrl: meta.logoUrl,
      nav: extractNav(home.html, home.url),
      contact: profile.contact,
      serviceTimes: profile.serviceTimes,
      importStatus: 'done',
      importError: null,
      importedAt: new Date(),
    });
    return { pages: extracted.length, skippedEdited };
  }
}
