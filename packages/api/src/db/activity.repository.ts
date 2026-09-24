import { Injectable } from '@nestjs/common';

import type { Activity, ActivityAsset } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ActivityWithAssets = Activity & { assets: ActivityAsset[] };

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  count(): Promise<number> {
    return this.prisma.activity.count();
  }

  list(): Promise<Activity[]> {
    return this.prisma.activity.findMany({ orderBy: { updatedAt: 'desc' }, take: 500 });
  }

  find(id: string): Promise<ActivityWithAssets | null> {
    return this.prisma.activity.findUnique({
      where: { id },
      include: { assets: { orderBy: { createdAt: 'asc' } } },
    });
  }

  create(data: {
    title: string;
    content: Prisma.InputJsonValue;
    userId: string | null;
  }): Promise<Activity> {
    return this.prisma.activity.create({
      data: {
        title: data.title,
        content: data.content,
        createdById: data.userId,
        updatedById: data.userId,
      },
    });
  }

  update(id: string, data: { title: string; content: Prisma.InputJsonValue; userId: string }) {
    return this.prisma.activity.update({
      where: { id },
      data: { title: data.title, content: data.content, updatedById: data.userId },
    });
  }

  delete(id: string): Promise<Activity> {
    return this.prisma.activity.delete({ where: { id } });
  }

  createAsset(data: {
    activityId: string;
    kind: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadedById: string;
  }): Promise<ActivityAsset> {
    return this.prisma.activityAsset.create({ data });
  }

  findAsset(activityId: string, assetId: string): Promise<ActivityAsset | null> {
    return this.prisma.activityAsset.findFirst({ where: { id: assetId, activityId } });
  }

  deleteAsset(assetId: string): Promise<ActivityAsset> {
    return this.prisma.activityAsset.delete({ where: { id: assetId } });
  }
}
