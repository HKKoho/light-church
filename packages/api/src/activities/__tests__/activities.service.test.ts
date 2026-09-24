// packages/api/src/activities/__tests__/activities.service.test.ts
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { activityContentSchema } from '@clawix/shared';

import type { ActivityRepository } from '../../db/activity.repository.js';
import { ActivitiesService } from '../activities.service.js';

const leader = { id: 'user-leader', role: 'ministry_leader' };
const member = { id: 'user-member', role: 'viewer' };
const content = (extra: Record<string, unknown> = {}) =>
  activityContentSchema.parse({ location: 'Camp site', ...extra });

interface Row {
  id: string;
  title: string;
  content: unknown;
  createdAt: Date;
  updatedAt: Date;
  assets: {
    id: string;
    activityId: string;
    kind: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: Date;
  }[];
}

/** In-memory stand-in for ActivityRepository. */
function fakeRepo() {
  const rows = new Map<string, Row>();
  let seq = 0;
  const cuid = () => `c${String(++seq).padStart(24, '0')}`;
  const repo = {
    rows,
    count: vi.fn(async () => rows.size),
    list: vi.fn(async () => [...rows.values()]),
    find: vi.fn(async (id: string) => rows.get(id) ?? null),
    create: vi.fn(async (d: { title: string; content: unknown }) => {
      const row: Row = {
        id: cuid(),
        title: d.title,
        content: d.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        assets: [],
      };
      rows.set(row.id, row);
      return row;
    }),
    update: vi.fn(async (id: string, d: { title: string; content: unknown }) => {
      const row = rows.get(id)!;
      Object.assign(row, { title: d.title, content: d.content, updatedAt: new Date() });
      return row;
    }),
    delete: vi.fn(async (id: string) => {
      const row = rows.get(id)!;
      rows.delete(id);
      return row;
    }),
    createAsset: vi.fn(
      async (d: {
        activityId: string;
        kind: string;
        fileName: string;
        mimeType: string;
        size: number;
      }) => {
        const asset = { id: cuid(), createdAt: new Date(), ...d };
        rows.get(d.activityId)!.assets.push(asset);
        return asset;
      },
    ),
    findAsset: vi.fn(
      async (activityId: string, assetId: string) =>
        rows.get(activityId)?.assets.find((a) => a.id === assetId) ?? null,
    ),
    deleteAsset: vi.fn(async (assetId: string) => {
      for (const row of rows.values()) {
        const i = row.assets.findIndex((a) => a.id === assetId);
        if (i >= 0) return row.assets.splice(i, 1)[0];
      }
      return null;
    }),
  };
  return repo;
}

describe('ActivitiesService', () => {
  let dir: string;
  let repo: ReturnType<typeof fakeRepo>;
  let service: ActivitiesService;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'activities-'));
    vi.stubEnv('WORKSPACE_BASE_PATH', dir);
    repo = fakeRepo();
    service = new ActivitiesService(repo as unknown as ActivityRepository);
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('creates the example activity once, and not again after it is deleted', async () => {
    expect(await service.seedExampleOnce()).toBe(true);
    const [example] = await service.list();
    expect(example?.title).toContain('印尼');

    await service.remove(example!.id, leader);
    expect(await service.seedExampleOnce()).toBe(false);
    expect(repo.rows.size).toBe(0);
  });

  it('does not create the example when activities already exist', async () => {
    await service.create({ title: 'Youth camp', content: content() }, leader);
    expect(await service.seedExampleOnce()).toBe(false);
    expect(repo.rows.size).toBe(1);
  });

  it('lets leaders edit and everyone view', async () => {
    const created = await service.create({ title: 'Youth camp', content: content() }, leader);
    expect(created.canEdit).toBe(true);

    const viewed = await service.get(created.id, member);
    expect(viewed.canEdit).toBe(false);
    expect(viewed.content.location).toBe('Camp site');

    await expect(
      service.update(created.id, { title: 'x', content: content() }, member),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.create({ title: 'x', content: content() }, member)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.remove(created.id, member)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns 404 for an unknown activity', async () => {
    await expect(service.get('missing', leader)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores, serves and deletes files, and clears references to deleted files', async () => {
    const { id } = await service.create({ title: 'Camp', content: content() }, leader);
    const png = Buffer.from('fake-png');
    const asset = await service.uploadAsset(
      id,
      { fileName: '../../cover.png', mimeType: 'image/png', data: png },
      leader,
    );
    expect(asset).toMatchObject({ kind: 'image', fileName: 'cover.png', size: png.length });
    expect(await fs.readFile(path.join(dir, 'activities', id, `${asset.id}.png`))).toEqual(png);

    await service.update(
      id,
      { title: 'Camp', content: content({ coverAssetId: asset.id }) },
      leader,
    );
    expect((await service.get(id, member)).content.coverAssetId).toBe(asset.id);

    const file = await service.readAsset(id, asset.id);
    expect(file).toMatchObject({ mimeType: 'image/png', fileName: 'cover.png' });
    expect(file.data).toEqual(png);

    await service.deleteAsset(id, asset.id, leader);
    const after = await service.get(id, member);
    expect(after.assets).toHaveLength(0);
    expect(after.content.coverAssetId).toBeNull();
    await expect(service.readAsset(id, asset.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('drops file references that belong to another activity', async () => {
    const a = await service.create({ title: 'A', content: content() }, leader);
    const b = await service.create({ title: 'B', content: content() }, leader);
    const asset = await service.uploadAsset(
      a.id,
      { fileName: 'song.mp3', mimeType: 'audio/mpeg', data: Buffer.from('mp3') },
      leader,
    );
    const saved = await service.update(
      b.id,
      {
        title: 'B',
        content: content({
          coverAssetId: asset.id,
          songs: [{ title: 'Song', audioAssetId: asset.id }],
        }),
      },
      leader,
    );
    expect(saved.content.coverAssetId).toBeNull();
    expect(saved.content.songs[0]?.audioAssetId).toBeNull();
  });

  it('rejects unsupported and empty files', async () => {
    const { id } = await service.create({ title: 'Camp', content: content() }, leader);
    await expect(
      service.uploadAsset(
        id,
        { fileName: 'x.exe', mimeType: 'application/x-msdownload', data: Buffer.from('MZ') },
        leader,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.uploadAsset(
        id,
        { fileName: 'x.pdf', mimeType: 'application/pdf', data: Buffer.alloc(0) },
        leader,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.uploadAsset(
        id,
        { fileName: 'x.png', mimeType: 'image/png', data: Buffer.from('x') },
        member,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('duplicates text content without files', async () => {
    const { id } = await service.create(
      { title: 'Camp', content: content({ notes: 'Bring torches' }) },
      leader,
    );
    await service.uploadAsset(
      id,
      { fileName: 'map.pdf', mimeType: 'application/pdf', data: Buffer.from('%PDF') },
      leader,
    );
    const copy = await service.duplicate(id, leader);
    expect(copy.title).toBe('Camp (copy)');
    expect(copy.content.notes).toBe('Bring torches');
    expect(copy.assets).toHaveLength(0);
  });

  it('removes an activity with its files', async () => {
    const { id } = await service.create({ title: 'Camp', content: content() }, leader);
    await service.uploadAsset(
      id,
      { fileName: 'a.txt', mimeType: 'text/plain', data: Buffer.from('hi') },
      leader,
    );
    await service.remove(id, leader);
    await expect(fs.access(path.join(dir, 'activities', id))).rejects.toThrow();
  });
});
