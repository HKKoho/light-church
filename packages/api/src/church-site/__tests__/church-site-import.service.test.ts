import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { OneShotLlmService } from '../../engine/one-shot/one-shot-llm.service.js';
import { ChurchSiteImportService } from '../church-site-import.service.js';
import { fakeChurchSiteRepo } from './fake-repo.js';
import { HOME, ORIGIN, page } from './fixtures.js';

const admin = { id: 'u-admin', role: 'admin_staff' };
const leader = { id: 'u-leader', role: 'ministry_leader' };

const CRAWL = {
  origin: ORIGIN,
  pages: [
    { url: `${ORIGIN}/`, html: HOME, depth: 0 },
    {
      url: `${ORIGIN}/about/`,
      html: page('About', '<p>About us, a friendly church.</p>'),
      depth: 1,
    },
    { url: `${ORIGIN}/聯絡/`, html: page('聯絡我們', '<p>Phone 2717-1325</p>'), depth: 1 },
  ],
};

describe('ChurchSiteImportService', () => {
  let repo: ReturnType<typeof fakeChurchSiteRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let llm: { complete: ReturnType<typeof vi.fn> };
  let service: ChurchSiteImportService;

  beforeEach(() => {
    repo = fakeChurchSiteRepo();
    audit = { create: vi.fn(async () => ({})) };
    llm = {
      complete: vi.fn(async () =>
        JSON.stringify({
          churchName: 'Example Church',
          serviceTimes: [{ label: 'Worship', time: '10:30' }],
        }),
      ),
    };
    service = new ChurchSiteImportService(
      repo,
      llm as unknown as OneShotLlmService,
      audit as unknown as AuditLogRepository,
    );
    service.crawl = vi.fn(async () => CRAWL);
  });

  const runImport = async () => {
    await service.start(`${ORIGIN}/`, admin);
    await service.running;
  };

  it('imports pages, menu and profile, and audits the import', async () => {
    await runImport();
    const slugs = [...repo.pages.values()].map((p) => p.slug);
    expect(slugs).toEqual(['home', 'about', '聯絡']);
    expect(repo.site).toMatchObject({
      churchName: 'Example Church',
      logoUrl: `${ORIGIN}/wp-content/uploads/logo.png`,
      serviceTimes: [{ label: 'Worship', time: '10:30' }],
      importStatus: 'done',
      importError: null,
      sourceUrl: `${ORIGIN}/`,
    });
    expect((repo.site['nav'] as unknown[]).length).toBe(4);
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: admin.id, action: 'church-site.import' }),
    );
    // The contact-like page is sent to the AI along with the home page.
    expect(llm.complete.mock.calls[0]![0].prompt).toContain('聯絡我們');
  });

  it('re-import updates imported pages but never pages staff edited', async () => {
    await runImport();
    const about = [...repo.pages.values()].find((p) => p.slug === 'about')!;
    const home = [...repo.pages.values()].find((p) => p.slug === 'home')!;
    await repo.updatePage(about.id, { markdown: 'Staff text', editedAt: new Date() });
    await repo.updatePage(home.id, { markdown: 'old', visibility: 'members' });

    await runImport();
    expect(repo.pages.get(about.id)!['markdown']).toBe('Staff text');
    expect(repo.pages.get(home.id)!['markdown']).toContain('Sunday worship');
    expect(repo.pages.get(home.id)!['visibility']).toBe('members');
    expect(repo.pages.size).toBe(3);
  });

  it('records a failed import', async () => {
    service.crawl = vi.fn(async () => {
      throw new Error('The website answered HTTP 500');
    });
    await runImport();
    expect(repo.site).toMatchObject({
      importStatus: 'failed',
      importError: 'The website answered HTTP 500',
    });
  });

  it('fails an import that finds no pages', async () => {
    service.crawl = vi.fn(async () => ({ origin: ORIGIN, pages: [] }));
    await runImport();
    expect(repo.site['importError']).toBe('No pages found');
  });

  it('refuses a second import while one is running', async () => {
    await repo.claimImport('x');
    await expect(service.start(`${ORIGIN}/`, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('is for site admins only', async () => {
    await expect(service.start(`${ORIGIN}/`, leader)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
