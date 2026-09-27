import { Injectable } from '@nestjs/common';

import type { ChurchSite, Prisma, SitePage } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SITE_ID = 'default';

export type SitePageSummaryRow = Omit<SitePage, 'markdown'>;

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  sourceUrl: true,
  visibility: true,
  sortOrder: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ChurchSiteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The one site row, created empty on first use. The public site's layout
   * and page read it in parallel, so two first requests can race to create
   * it: the loser just reads the winner's row.
   */
  async getSite(): Promise<ChurchSite> {
    const existing = await this.prisma.churchSite.findUnique({ where: { id: SITE_ID } });
    if (existing) return existing;
    try {
      return await this.prisma.churchSite.create({ data: { id: SITE_ID } });
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err;
      return this.prisma.churchSite.findUniqueOrThrow({ where: { id: SITE_ID } });
    }
  }

  updateSite(data: Prisma.ChurchSiteUpdateInput): Promise<ChurchSite> {
    return this.prisma.churchSite.upsert({
      where: { id: SITE_ID },
      create: { id: SITE_ID, ...(data as Prisma.ChurchSiteCreateInput) },
      update: data,
    });
  }

  /** Mark an import as running unless one already is; false if one is. */
  async claimImport(sourceUrl: string): Promise<boolean> {
    await this.getSite();
    const { count } = await this.prisma.churchSite.updateMany({
      where: { id: SITE_ID, importStatus: { not: 'running' } },
      data: { importStatus: 'running', importError: null, sourceUrl },
    });
    return count === 1;
  }

  listPages(visibility?: readonly string[]): Promise<SitePageSummaryRow[]> {
    return this.prisma.sitePage.findMany({
      where: visibility ? { visibility: { in: [...visibility] } } : {},
      select: summarySelect,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  findPage(id: string): Promise<SitePage | null> {
    return this.prisma.sitePage.findUnique({ where: { id } });
  }

  findPageBySlug(slug: string): Promise<SitePage | null> {
    return this.prisma.sitePage.findUnique({ where: { slug } });
  }

  createPage(data: Prisma.SitePageCreateInput): Promise<SitePage> {
    return this.prisma.sitePage.create({ data });
  }

  updatePage(id: string, data: Prisma.SitePageUpdateInput): Promise<SitePage> {
    return this.prisma.sitePage.update({ where: { id }, data });
  }

  deletePage(id: string): Promise<SitePage> {
    return this.prisma.sitePage.delete({ where: { id } });
  }
}
