// packages/api/src/church-site/site-content.service.ts
//
// Events and media (sermons, recordings, documents) on the church's site.
// Pastors, ministry leaders and admin staff publish them; the public sees
// public items, signed-in members also see members-only ones.
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SaveSiteEventInput,
  SaveSiteMediaInput,
  SiteEventInfo,
  SiteMediaInfo,
  SiteMediaKind,
  SiteVisibility,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import { SiteContentRepository } from '../db/site-content.repository.js';
import type { SiteEvent, SiteMedia } from '../generated/prisma/client.js';
import { SystemSettingsService } from '../system-settings/system-settings.service.js';
import { assertSiteEditor, type Actor } from './church-site.roles.js';

export function toEventInfo(row: SiteEvent): SiteEventInfo {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time,
    location: row.location,
    description: row.description,
    registrationUrl: row.registrationUrl,
    visibility: row.visibility as SiteVisibility,
  };
}

export function toMediaInfo(row: SiteMedia): SiteMediaInfo {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind as SiteMediaKind,
    url: row.url,
    speaker: row.speaker,
    date: row.date,
    description: row.description,
    visibility: row.visibility as SiteVisibility,
  };
}

/** YYYY-MM-DD in `timeZone` — events are stored as the church's local dates. */
export function localDate(timeZone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

@Injectable()
export class SiteContentService {
  constructor(
    private readonly repo: SiteContentRepository,
    private readonly audit: AuditLogRepository,
    private readonly settings: SystemSettingsService,
  ) {}

  private log(actor: Actor, action: string, id: string, title: string) {
    return this.audit.create({
      userId: actor.id,
      action: `church-site.${action}`,
      resource: 'church-site',
      resourceId: id,
      details: { title },
    });
  }

  // ── Events ───────────────────────────────────────────────────────────

  async listEvents(actor: Actor): Promise<SiteEventInfo[]> {
    assertSiteEditor(actor);
    return (await this.repo.listEvents()).map(toEventInfo);
  }

  async createEvent(input: SaveSiteEventInput, actor: Actor): Promise<SiteEventInfo> {
    assertSiteEditor(actor);
    const row = await this.repo.createEvent({ ...input, createdById: actor.id });
    await this.log(actor, 'event.create', row.id, row.title);
    return toEventInfo(row);
  }

  async updateEvent(id: string, input: SaveSiteEventInput, actor: Actor): Promise<SiteEventInfo> {
    assertSiteEditor(actor);
    if (!(await this.repo.findEvent(id))) throw new NotFoundException('Event not found');
    const row = await this.repo.updateEvent(id, input);
    await this.log(actor, 'event.update', id, row.title);
    return toEventInfo(row);
  }

  async deleteEvent(id: string, actor: Actor): Promise<void> {
    assertSiteEditor(actor);
    const row = await this.repo.findEvent(id);
    if (!row) throw new NotFoundException('Event not found');
    await this.repo.deleteEvent(id);
    await this.log(actor, 'event.delete', id, row.title);
  }

  /** Upcoming events with one of the given visibilities, soonest first. */
  async upcomingEvents(visibility: readonly SiteVisibility[]): Promise<SiteEventInfo[]> {
    const { defaultTimezone } = await this.settings.get();
    return (await this.repo.listEvents(visibility, localDate(defaultTimezone))).map(toEventInfo);
  }

  // ── Media ────────────────────────────────────────────────────────────

  async listMedia(actor: Actor): Promise<SiteMediaInfo[]> {
    assertSiteEditor(actor);
    return (await this.repo.listMedia()).map(toMediaInfo);
  }

  async createMedia(input: SaveSiteMediaInput, actor: Actor): Promise<SiteMediaInfo> {
    assertSiteEditor(actor);
    const row = await this.repo.createMedia({ ...input, createdById: actor.id });
    await this.log(actor, 'media.create', row.id, row.title);
    return toMediaInfo(row);
  }

  async updateMedia(id: string, input: SaveSiteMediaInput, actor: Actor): Promise<SiteMediaInfo> {
    assertSiteEditor(actor);
    if (!(await this.repo.findMedia(id))) throw new NotFoundException('Media not found');
    const row = await this.repo.updateMedia(id, input);
    await this.log(actor, 'media.update', id, row.title);
    return toMediaInfo(row);
  }

  async deleteMedia(id: string, actor: Actor): Promise<void> {
    assertSiteEditor(actor);
    const row = await this.repo.findMedia(id);
    if (!row) throw new NotFoundException('Media not found');
    await this.repo.deleteMedia(id);
    await this.log(actor, 'media.delete', id, row.title);
  }

  async mediaFor(visibility: readonly SiteVisibility[]): Promise<SiteMediaInfo[]> {
    return (await this.repo.listMedia(visibility)).map(toMediaInfo);
  }
}
