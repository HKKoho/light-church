import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { SiteContentRepository } from '../../db/site-content.repository.js';
import type { SystemSettingsService } from '../../system-settings/system-settings.service.js';
import { localDate, SiteContentService } from '../site-content.service.js';

const leader = { id: 'u-leader', role: 'ministry_leader' };
const volunteer = { id: 'u-vol', role: 'volunteer' };

const event = (extra: Record<string, unknown> = {}) => ({
  title: 'Harvest Festival',
  date: '2099-10-01',
  time: '10:00',
  location: 'Hall',
  description: '',
  registrationUrl: '',
  visibility: 'public' as const,
  ...extra,
});
const media = (extra: Record<string, unknown> = {}) => ({
  title: 'Sunday sermon',
  kind: 'video' as const,
  url: 'https://youtu.be/abc',
  speaker: 'Pastor Lee',
  date: '2026-09-20',
  description: '',
  visibility: 'public' as const,
  ...extra,
});

function fakeRepo() {
  const events = new Map<string, Record<string, unknown>>();
  const mediaRows = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const table = (rows: Map<string, Record<string, unknown>>) => ({
    find: vi.fn(async (id: string) => rows.get(id) ?? null),
    create: vi.fn(async (data: Record<string, unknown>) => {
      const row = { ...data, id: `r${++seq}`, createdAt: new Date() };
      rows.set(row.id, row);
      return row;
    }),
    update: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const row = { ...rows.get(id)!, ...data };
      rows.set(id, row);
      return row;
    }),
    delete: vi.fn(async (id: string) => {
      const row = rows.get(id)!;
      rows.delete(id);
      return row;
    }),
  });
  const e = table(events);
  const m = table(mediaRows);
  const filter = (rows: Map<string, Record<string, unknown>>, vis?: string[]) =>
    [...rows.values()].filter((r) => !vis || vis.includes(r['visibility'] as string));
  return {
    events,
    listEvents: vi.fn(async (vis?: string[], from?: string) =>
      filter(events, vis).filter((r) => !from || (r['date'] as string) >= from),
    ),
    findEvent: e.find,
    createEvent: e.create,
    updateEvent: e.update,
    deleteEvent: e.delete,
    listMedia: vi.fn(async (vis?: string[]) => filter(mediaRows, vis)),
    findMedia: m.find,
    createMedia: m.create,
    updateMedia: m.update,
    deleteMedia: m.delete,
  };
}

describe('localDate', () => {
  it('formats the date in the given time zone, falling back to UTC', () => {
    const now = new Date('2026-09-26T20:00:00Z');
    expect(localDate('Asia/Hong_Kong', now)).toBe('2026-09-27');
    expect(localDate('UTC', now)).toBe('2026-09-26');
    expect(localDate('Not/AZone', now)).toBe('2026-09-26');
  });
});

describe('SiteContentService', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let audit: { create: ReturnType<typeof vi.fn> };
  let service: SiteContentService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = { create: vi.fn(async () => ({})) };
    const settings = { get: vi.fn(async () => ({ defaultTimezone: 'Asia/Hong_Kong' })) };
    service = new SiteContentService(
      repo as unknown as SiteContentRepository,
      audit as unknown as AuditLogRepository,
      settings as unknown as SystemSettingsService,
    );
  });

  it('lets editors create, update, list and delete events, audited', async () => {
    const created = await service.createEvent(event(), leader);
    expect(repo.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ createdById: leader.id }),
    );
    const updated = await service.updateEvent(created.id, event({ title: 'Harvest Fair' }), leader);
    expect(updated.title).toBe('Harvest Fair');
    expect(await service.listEvents(leader)).toHaveLength(1);
    await service.deleteEvent(created.id, leader);
    expect(repo.events.size).toBe(0);
    expect(audit.create.mock.calls.map((c) => c[0].action)).toEqual([
      'church-site.event.create',
      'church-site.event.update',
      'church-site.event.delete',
    ]);
  });

  it('lets editors manage media', async () => {
    const created = await service.createMedia(media(), leader);
    expect(created).toMatchObject({ kind: 'video', speaker: 'Pastor Lee' });
    expect((await service.updateMedia(created.id, media({ kind: 'audio' }), leader)).kind).toBe(
      'audio',
    );
    expect(await service.listMedia(leader)).toHaveLength(1);
    await service.deleteMedia(created.id, leader);
    expect(await service.listMedia(leader)).toHaveLength(0);
  });

  it('404s unknown events and media', async () => {
    await expect(service.updateEvent('x', event(), leader)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.deleteEvent('x', leader)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateMedia('x', media(), leader)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.deleteMedia('x', leader)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids non-editors', async () => {
    await expect(service.createEvent(event(), volunteer)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.listMedia(volunteer)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('shows only upcoming events and media with the requested visibility', async () => {
    await service.createEvent(event(), leader);
    await service.createEvent(event({ title: 'Past', date: '2000-01-01' }), leader);
    await service.createEvent(event({ title: 'Inner', visibility: 'members' }), leader);
    await service.createMedia(media(), leader);
    await service.createMedia(media({ title: 'Draft', visibility: 'hidden' }), leader);

    expect((await service.upcomingEvents(['public'])).map((e) => e.title)).toEqual([
      'Harvest Festival',
    ]);
    expect((await service.upcomingEvents(['members'])).map((e) => e.title)).toEqual(['Inner']);
    expect((await service.mediaFor(['public'])).map((m) => m.title)).toEqual(['Sunday sermon']);
  });
});
