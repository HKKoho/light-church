// packages/api/src/activities/activities.service.ts
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { ACTIVITY_EDITOR_ROLES, activityContentSchema, createLogger } from '@clawix/shared';
import type {
  ActivityAssetInfo,
  ActivityAssetKind,
  ActivityContent,
  ActivityDetail,
  ActivitySummary,
  SaveActivityInput,
} from '@clawix/shared';

import { ActivityRepository, type ActivityWithAssets } from '../db/activity.repository.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ScopedFs } from '../workspace/scoped-fs.js';
import { INDONESIA_2026_CONTENT, INDONESIA_2026_TITLE } from './examples/indonesia-2026.js';

const logger = createLogger('activities');

/** Roles that create and edit activities; every signed-in user can view them. */
const EDITOR_ROLES: ReadonlySet<string> = new Set(ACTIVITY_EDITOR_ROLES);

const MB = 1024 * 1024;
const ASSET_RULES: Record<ActivityAssetKind, { types: Record<string, string>; maxBytes: number }> =
  {
    image: {
      types: {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      },
      maxBytes: 10 * MB,
    },
    document: {
      types: {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'text/plain': '.txt',
      },
      maxBytes: 20 * MB,
    },
    audio: {
      types: {
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/x-m4a': '.m4a',
        'audio/wav': '.wav',
      },
      maxBytes: 25 * MB,
    },
  };

/** Marker in the data dir so the example is created once, never re-created after deletion. */
const EXAMPLE_MARKER = '.example-seeded';

interface Actor {
  readonly id: string;
  readonly role: string;
}

function assetKind(mimeType: string): ActivityAssetKind | null {
  for (const [kind, rule] of Object.entries(ASSET_RULES) as [
    ActivityAssetKind,
    (typeof ASSET_RULES)['image'],
  ][]) {
    if (mimeType in rule.types) return kind;
  }
  return null;
}

@Injectable()
export class ActivitiesService implements OnModuleInit {
  constructor(private readonly repo: ActivityRepository) {}

  private static root(): string {
    return path.resolve(process.env['WORKSPACE_BASE_PATH'] ?? './data', 'activities');
  }

  private async files(): Promise<ScopedFs> {
    await fs.mkdir(ActivitiesService.root(), { recursive: true });
    return new ScopedFs(ActivitiesService.root());
  }

  private static assertEditor(actor: Actor): void {
    if (!EDITOR_ROLES.has(actor.role)) {
      throw new ForbiddenException('Only ministry leaders and staff can edit activities');
    }
  }

  private static assetPath(activityId: string, assetId: string, mimeType: string): string {
    const kind = assetKind(mimeType);
    const ext = kind ? (ASSET_RULES[kind].types[mimeType] ?? '') : '';
    return `/${activityId}/${assetId}${ext}`;
  }

  private static toAssetInfo(a: ActivityWithAssets['assets'][number]): ActivityAssetInfo {
    return {
      id: a.id,
      kind: a.kind as ActivityAssetKind,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt.toISOString(),
    };
  }

  /** Parses stored content, tolerating older/partial documents. */
  private static readContent(raw: unknown): ActivityContent {
    const parsed = activityContentSchema.safeParse(raw);
    return parsed.success ? parsed.data : activityContentSchema.parse({});
  }

  /** File references may only point at this activity's own assets. */
  private static pruneAssetRefs(
    content: ActivityContent,
    assetIds: ReadonlySet<string>,
  ): ActivityContent {
    const keep = (id: string | null) => (id && assetIds.has(id) ? id : null);
    return {
      ...content,
      coverAssetId: keep(content.coverAssetId),
      songs: content.songs.map((s) => ({ ...s, audioAssetId: keep(s.audioAssetId) })),
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.seedExampleOnce();
    } catch (err) {
      logger.warn({ err }, 'Could not create the example activity');
    }
  }

  async seedExampleOnce(): Promise<boolean> {
    const marker = path.join(ActivitiesService.root(), EXAMPLE_MARKER);
    await fs.mkdir(ActivitiesService.root(), { recursive: true });
    const seeded = await fs
      .access(marker)
      .then(() => true)
      .catch(() => false);
    if (seeded || (await this.repo.count()) > 0) return false;
    await this.repo.create({
      title: INDONESIA_2026_TITLE,
      content: INDONESIA_2026_CONTENT as unknown as Prisma.InputJsonValue,
      userId: null,
    });
    await fs.writeFile(marker, new Date().toISOString());
    logger.info('Created the example Mission/Camp activity');
    return true;
  }

  async list(): Promise<ActivitySummary[]> {
    const rows = await this.repo.list();
    return rows.map((row) => {
      const c = ActivitiesService.readContent(row.content);
      return {
        id: row.id,
        title: row.title,
        kind: c.kind,
        location: c.location,
        startDate: c.startDate,
        endDate: c.endDate,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  private async load(id: string): Promise<ActivityWithAssets> {
    const row = await this.repo.find(id);
    if (!row) throw new NotFoundException('Activity not found');
    return row;
  }

  async get(id: string, actor: Actor): Promise<ActivityDetail> {
    const row = await this.load(id);
    return {
      id: row.id,
      title: row.title,
      content: ActivitiesService.readContent(row.content),
      assets: row.assets.map((a) => ActivitiesService.toAssetInfo(a)),
      canEdit: EDITOR_ROLES.has(actor.role),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async create(input: SaveActivityInput, actor: Actor): Promise<ActivityDetail> {
    ActivitiesService.assertEditor(actor);
    // A new activity has no files yet, so any file references are dropped.
    const content = ActivitiesService.pruneAssetRefs(input.content, new Set());
    const row = await this.repo.create({
      title: input.title,
      content: content as unknown as Prisma.InputJsonValue,
      userId: actor.id,
    });
    logger.info({ id: row.id, userId: actor.id }, 'Created activity');
    return this.get(row.id, actor);
  }

  async update(id: string, input: SaveActivityInput, actor: Actor): Promise<ActivityDetail> {
    ActivitiesService.assertEditor(actor);
    const row = await this.load(id);
    const content = ActivitiesService.pruneAssetRefs(
      input.content,
      new Set(row.assets.map((a) => a.id)),
    );
    await this.repo.update(id, {
      title: input.title,
      content: content as unknown as Prisma.InputJsonValue,
      userId: actor.id,
    });
    return this.get(id, actor);
  }

  /** Copies an activity's text content (not its files) as a starting point. */
  async duplicate(id: string, actor: Actor): Promise<ActivityDetail> {
    ActivitiesService.assertEditor(actor);
    const row = await this.load(id);
    return this.create(
      {
        title: `${row.title} (copy)`.slice(0, 200),
        content: ActivitiesService.readContent(row.content),
      },
      actor,
    );
  }

  async remove(id: string, actor: Actor): Promise<void> {
    ActivitiesService.assertEditor(actor);
    await this.load(id);
    await this.repo.delete(id); // assets cascade in the database
    const sfs = await this.files();
    if (await sfs.exists(`/${id}`)) await sfs.remove(`/${id}`);
    logger.info({ id, userId: actor.id }, 'Deleted activity');
  }

  async uploadAsset(
    id: string,
    file: { fileName: string; mimeType: string; data: Buffer },
    actor: Actor,
  ): Promise<ActivityAssetInfo> {
    ActivitiesService.assertEditor(actor);
    await this.load(id);
    const kind = assetKind(file.mimeType);
    if (!kind) {
      throw new BadRequestException(
        'Upload an image (JPG/PNG/WebP/GIF), a document (PDF/Word/Excel/PowerPoint/TXT) or audio (MP3/M4A/WAV)',
      );
    }
    if (file.data.length === 0 || file.data.length > ASSET_RULES[kind].maxBytes) {
      throw new BadRequestException(
        `File is empty or larger than ${ASSET_RULES[kind].maxBytes / MB} MB`,
      );
    }
    const asset = await this.repo.createAsset({
      activityId: id,
      kind,
      fileName: path.basename(file.fileName).slice(0, 255) || 'file',
      mimeType: file.mimeType,
      size: file.data.length,
      uploadedById: actor.id,
    });
    const sfs = await this.files();
    await sfs.writeFile(ActivitiesService.assetPath(id, asset.id, asset.mimeType), file.data);
    return ActivitiesService.toAssetInfo(asset);
  }

  async readAsset(
    id: string,
    assetId: string,
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const asset = await this.repo.findAsset(id, assetId);
    if (!asset) throw new NotFoundException('File not found');
    const sfs = await this.files();
    const data = (await sfs.readFile(
      ActivitiesService.assetPath(id, assetId, asset.mimeType),
    )) as Buffer;
    return { data, mimeType: asset.mimeType, fileName: asset.fileName };
  }

  async deleteAsset(id: string, assetId: string, actor: Actor): Promise<void> {
    ActivitiesService.assertEditor(actor);
    const asset = await this.repo.findAsset(id, assetId);
    if (!asset) throw new NotFoundException('File not found');
    await this.repo.deleteAsset(assetId);
    const sfs = await this.files();
    const file = ActivitiesService.assetPath(id, assetId, asset.mimeType);
    if (await sfs.exists(file)) await sfs.remove(file);
    // Drop references to the deleted file from the activity's content.
    const row = await this.load(id);
    const content = ActivitiesService.pruneAssetRefs(
      ActivitiesService.readContent(row.content),
      new Set(row.assets.map((a) => a.id)),
    );
    await this.repo.update(id, {
      title: row.title,
      content: content as unknown as Prisma.InputJsonValue,
      userId: actor.id,
    });
  }
}
