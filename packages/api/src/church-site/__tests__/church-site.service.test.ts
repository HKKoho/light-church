import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import { ChurchSiteService, toSiteInfo } from '../church-site.service.js';
import { fakeChurchSiteRepo } from './fake-repo.js';

const admin = { id: 'u-admin', role: 'super_admin' };
const pastor = { id: 'u-pastor', role: 'pastor' };

const pageInput = (slug: string, visibility: 'public' | 'members' | 'hidden' = 'public') => ({
  slug,
  title: slug,
  markdown: `# ${slug}`,
  visibility,
  sortOrder: 0,
});

const settings = {
  churchName: 'Example Church',
  tagline: '',
  logoUrl: '',
  nav: [{ label: 'About', href: '/churchweb/about', children: [] }],
  contact: { locations: [], email: 'a@b.org', phone: '' },
  serviceTimes: [],
  published: true,
};

describe('ChurchSiteService', () => {
  let repo: ReturnType<typeof fakeChurchSiteRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: ChurchSiteService;

  beforeEach(() => {
    repo = fakeChurchSiteRepo();
    audit = { create: vi.fn(async () => ({})) };
    service = new ChurchSiteService(repo, audit as unknown as AuditLogRepository);
  });

  it('lets site admins read and update the settings, audited', async () => {
    const info = await service.updateSite(settings, admin);
    expect(info).toMatchObject({ churchName: 'Example Church', published: true });
    expect(await service.getSite(admin)).toMatchObject({ nav: settings.nav });
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'church-site.update', details: { published: true } }),
    );
  });

  it('forbids other roles from staff actions', async () => {
    await expect(service.getSite(pastor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.createPage(pageInput('a'), pastor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('reads stored JSON defensively', () => {
    const info = toSiteInfo({ ...(repo.site as never), nav: 'bad', contact: null });
    expect(info.nav).toEqual([]);
    expect(info.contact).toEqual({ locations: [], email: '', phone: '' });
  });

  it('creates pages with unique slugs, marked as edited', async () => {
    const page = await service.createPage(pageInput('about'), admin);
    expect(page).toMatchObject({ slug: 'about', edited: true });
    await expect(service.createPage(pageInput('about'), admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updates a page, refusing a slug another page uses', async () => {
    const a = await service.createPage(pageInput('a'), admin);
    await service.createPage(pageInput('b'), admin);
    await expect(service.updatePage(a.id, pageInput('b'), admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const updated = await service.updatePage(a.id, { ...pageInput('a'), title: 'New' }, admin);
    expect(updated.title).toBe('New');
    await expect(service.updatePage('nope', pageInput('x'), admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists, gets and deletes pages', async () => {
    const a = await service.createPage(pageInput('a'), admin);
    expect(await service.listPages(admin)).toHaveLength(1);
    expect((await service.getPage(a.id, admin)).markdown).toBe('# a');
    await service.deletePage(a.id, admin);
    await expect(service.getPage(a.id, admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deletePage(a.id, admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('shows the public only public pages, and members also members-only pages', async () => {
    await service.createPage(pageInput('open'), admin);
    await service.createPage(pageInput('inner', 'members'), admin);
    await service.createPage(pageInput('draft', 'hidden'), admin);

    const site = await service.publicSite();
    expect(site.pages.map((p) => p.slug)).toEqual(['open']);
    expect(site.site).not.toHaveProperty('importStatus');
    expect(site.site).not.toHaveProperty('sourceUrl');

    await expect(service.pageBySlug('inner', false)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.pageBySlug('inner', true)).slug).toBe('inner');
    await expect(service.pageBySlug('draft', true)).rejects.toBeInstanceOf(NotFoundException);
    expect(await service.membersPages()).toEqual([{ slug: 'inner', title: 'inner' }]);
  });
});
