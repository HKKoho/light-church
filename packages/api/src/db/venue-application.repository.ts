import { Injectable } from '@nestjs/common';

import type { Prisma, VenueApplication } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type VenueApplicationWithReviewer = VenueApplication & {
  reviewedBy: { name: string } | null;
};

const withReviewer = { reviewedBy: { select: { name: true } } } as const;

@Injectable()
export class VenueApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: string): Promise<VenueApplicationWithReviewer[]> {
    return this.prisma.venueApplication.findMany({
      where: status ? { status } : {},
      include: withReviewer,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  find(id: string): Promise<VenueApplicationWithReviewer | null> {
    return this.prisma.venueApplication.findUnique({ where: { id }, include: withReviewer });
  }

  create(data: Prisma.VenueApplicationCreateInput): Promise<VenueApplication> {
    return this.prisma.venueApplication.create({ data });
  }

  review(
    id: string,
    data: { status: string; adminNotes: string | null; reviewedById: string },
  ): Promise<VenueApplicationWithReviewer> {
    return this.prisma.venueApplication.update({
      where: { id },
      data: { ...data, reviewedAt: new Date() },
      include: withReviewer,
    });
  }

  delete(id: string): Promise<VenueApplication> {
    return this.prisma.venueApplication.delete({ where: { id } });
  }
}
