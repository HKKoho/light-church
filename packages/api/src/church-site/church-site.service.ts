// packages/api/src/church-site/church-site.service.ts
//
// The church's public site settings and content pages: staff edit them, the
// public site reads the public ones, signed-in members also see members-only.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  siteContactSchema,
  siteNavItemSchema,
  siteServiceTimeSchema,
  type ChurchSiteInfo,
  type PublicChurchSite,
  type SaveSitePageInput,
  type SiteImportStatus,
  type SitePageDetail,
  type SitePageSummary,
  type SiteVisibility,
  type UpdateChurchSiteInput,
} from '@clawix/shared';
import { z } from 'zod';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { ChurchSiteRepository, type SitePageSummaryRow } from '../db/church-site.repository.js';
import type { ChurchSite, Prisma, SitePage } from '../generated/prisma/client.js';
import { assertSiteAdmin, type Actor } from './church-site.roles.js';

const PUBLIC: readonly SiteVisibility[] = ['public'];
const MEMBERS: readonly SiteVisibility[] = ['public', 'members'];

/** Stored JSON is read defensively: a bad row shouldn't take the site down. */
const navList = z.array(siteNavItemSchema).catch([]);
const contact = siteContactSchema.catch({ locations: [], email: '', phone: '' });
const serviceTimes = z.array(siteServiceTimeSchema).catch([]);

export function toSiteInfo(row: ChurchSite): ChurchSiteInfo {
  return {
    sourceUrl: row.sourceUrl,
    churchName: row.churchName,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    nav: navList.parse(row.nav),
    contact: contact.parse(row.contact),
    serviceTimes: serviceTimes.parse(row.serviceTimes),
    published: row.published,
    importStatus: row.importStatus as SiteImportStatus,
    importError: row.importError,
    importedAt: row.importedAt?.toISOString() ?? null,
  };
}

function toSummary(row: SitePageSummaryRow): SitePageSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    visibility: row.visibility as SiteVisibility,
    sortOrder: row.sortOrder,
    sourceUrl: row.sourceUrl,
    edited: row.editedAt !== null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const toDetail = (row: SitePage): SitePageDetail => ({ ...toSummary(row), markdown: row.markdown });

@Injectable()
export class ChurchSiteService {
  constructor(
    private readonly repo: ChurchSiteRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  private log(actor: Actor, action: string, resourceId: string, details: Prisma.InputJsonValue) {
    return this.audit.create({
      userId: actor.id,
      action: `church-site.${action}`,
      resource: 'church-site',
      resourceId,
      details,
    });
  }

  // ── Staff ────────────────────────────────────────────────────────────

  async getSite(actor: Actor): Promise<ChurchSiteInfo> {
    assertSiteAdmin(actor);
    return toSiteInfo(await this.repo.getSite());
  }

  async updateSite(input: UpdateChurchSiteInput, actor: Actor): Promise<ChurchSiteInfo> {
    assertSiteAdmin(actor);
    const row = await this.repo.updateSite(input);
    await this.log(actor, 'update', 'default', { published: input.published });
    return toSiteInfo(row);
  }

  async listPages(actor: Actor): Promise<SitePageSummary[]> {
    assertSiteAdmin(actor);
    return (await this.repo.listPages()).map(toSummary);
  }

  async getPage(id: string, actor: Actor): Promise<SitePageDetail> {
    assertSiteAdmin(actor);
    const row = await this.repo.findPage(id);
    if (!row) throw new NotFoundException('Page not found');
    return toDetail(row);
  }

  async createPage(input: SaveSitePageInput, actor: Actor): Promise<SitePageDetail> {
    assertSiteAdmin(actor);
    if (await this.repo.findPageBySlug(input.slug)) {
      throw new ConflictException(`A page already uses /${input.slug}`);
    }
    const row = await this.repo.createPage({ ...input, editedAt: new Date() });
    await this.log(actor, 'page.create', row.id, { slug: row.slug });
    return toDetail(row);
  }

  /** Staff edits mark the page as edited, so a re-import leaves it alone. */
  async updatePage(id: string, input: SaveSitePageInput, actor: Actor): Promise<SitePageDetail> {
    assertSiteAdmin(actor);
    if (!(await this.repo.findPage(id))) throw new NotFoundException('Page not found');
    const clash = await this.repo.findPageBySlug(input.slug);
    if (clash && clash.id !== id) throw new ConflictException(`A page already uses /${input.slug}`);
    const row = await this.repo.updatePage(id, { ...input, editedAt: new Date() });
    await this.log(actor, 'page.update', id, { slug: row.slug });
    return toDetail(row);
  }

  async deletePage(id: string, actor: Actor): Promise<void> {
    assertSiteAdmin(actor);
    const row = await this.repo.findPage(id);
    if (!row) throw new NotFoundException('Page not found');
    await this.repo.deletePage(id);
    await this.log(actor, 'page.delete', id, { slug: row.slug });
  }

  // ── Public site and members ──────────────────────────────────────────

  async publicSite(): Promise<PublicChurchSite> {
    const {
      importStatus: _s,
      importError: _e,
      sourceUrl: _u,
      ...site
    } = toSiteInfo(await this.repo.getSite());
    const pages = (await this.repo.listPages(PUBLIC)).map(({ slug, title }) => ({ slug, title }));
    return { site, pages };
  }

  /** A page by slug, if its visibility is one of `allowed`. */
  async pageBySlug(slug: string, members: boolean): Promise<SitePageDetail> {
    const row = await this.repo.findPageBySlug(slug);
    const allowed = members ? MEMBERS : PUBLIC;
    if (!row || !allowed.includes(row.visibility as SiteVisibility)) {
      throw new NotFoundException('Page not found');
    }
    return toDetail(row);
  }

  async membersPages(): Promise<{ slug: string; title: string }[]> {
    return (await this.repo.listPages(['members'])).map(({ slug, title }) => ({ slug, title }));
  }
}
