import { Injectable } from '@nestjs/common';

import type { Prisma, SiteEvent, SiteMedia } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const LIMIT = 500;

/** Events and media shown on the church's public site. */
@Injectable()
export class SiteContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Events in date order; `from` (YYYY-MM-DD) keeps only upcoming ones. */
  listEvents(visibility?: readonly string[], from?: string): Promise<SiteEvent[]> {
    return this.prisma.siteEvent.findMany({
      where: {
        ...(visibility ? { visibility: { in: [...visibility] } } : {}),
        ...(from ? { date: { gte: from } } : {}),
      },
      orderBy: [{ date: from ? 'asc' : 'desc' }, { time: 'asc' }],
      take: LIMIT,
    });
  }

  findEvent(id: string): Promise<SiteEvent | null> {
    return this.prisma.siteEvent.findUnique({ where: { id } });
  }

  createEvent(data: Prisma.SiteEventUncheckedCreateInput): Promise<SiteEvent> {
    return this.prisma.siteEvent.create({ data });
  }

  updateEvent(id: string, data: Prisma.SiteEventUncheckedUpdateInput): Promise<SiteEvent> {
    return this.prisma.siteEvent.update({ where: { id }, data });
  }

  deleteEvent(id: string): Promise<SiteEvent> {
    return this.prisma.siteEvent.delete({ where: { id } });
  }

  /** Newest first. */
  listMedia(visibility?: readonly string[]): Promise<SiteMedia[]> {
    return this.prisma.siteMedia.findMany({
      where: visibility ? { visibility: { in: [...visibility] } } : {},
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: LIMIT,
    });
  }

  findMedia(id: string): Promise<SiteMedia | null> {
    return this.prisma.siteMedia.findUnique({ where: { id } });
  }

  createMedia(data: Prisma.SiteMediaUncheckedCreateInput): Promise<SiteMedia> {
    return this.prisma.siteMedia.create({ data });
  }

  updateMedia(id: string, data: Prisma.SiteMediaUncheckedUpdateInput): Promise<SiteMedia> {
    return this.prisma.siteMedia.update({ where: { id }, data });
  }

  deleteMedia(id: string): Promise<SiteMedia> {
    return this.prisma.siteMedia.delete({ where: { id } });
  }
}
