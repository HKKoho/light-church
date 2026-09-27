// packages/api/src/venue-rental/venue-rental.service.ts
//
// Rent Church Place: anyone can submit a venue-rental application from the
// public /rent page; reviewer roles list, approve/reject and delete them.
import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createLogger, VENUE_RENTAL_REVIEWER_ROLES } from '@clawix/shared';
import type {
  ReviewVenueApplicationInput,
  VenueApplicationData,
  VenueApplicationInfo,
  VenueApplicationStatus,
  VenueSession,
} from '@clawix/shared';

import { AuditLogRepository } from '../db/audit-log.repository.js';
import {
  VenueApplicationRepository,
  type VenueApplicationWithReviewer,
} from '../db/venue-application.repository.js';

const logger = createLogger('venue-rental');

const REVIEWERS: ReadonlySet<string> = new Set(VENUE_RENTAL_REVIEWER_ROLES);

export interface Actor {
  readonly id: string;
  readonly role: string;
}

function toInfo(row: VenueApplicationWithReviewer): VenueApplicationInfo {
  return {
    id: row.id,
    organization: row.organization,
    contactPerson: row.contactPerson,
    contactTitle: row.contactTitle as VenueApplicationInfo['contactTitle'],
    mobile: row.mobile,
    email: row.email,
    venueType: row.venueType as VenueApplicationInfo['venueType'],
    roomCount: row.roomCount,
    sessions: row.sessions as unknown as VenueSession[],
    activityNature: row.activityNature as VenueApplicationInfo['activityNature'],
    activityMode: row.activityMode as VenueApplicationInfo['activityMode'],
    activityFee: row.activityFee === null ? null : row.activityFee.toNumber(),
    targetAudience: row.targetAudience as VenueApplicationInfo['targetAudience'],
    attendanceRange: row.attendanceRange as VenueApplicationInfo['attendanceRange'],
    description: row.description,
    repName: row.repName,
    repTitle: row.repTitle as VenueApplicationInfo['repTitle'],
    status: row.status as VenueApplicationStatus,
    adminNotes: row.adminNotes,
    reviewedByName: row.reviewedBy?.name ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class VenueRentalService {
  constructor(
    private readonly repo: VenueApplicationRepository,
    private readonly audit: AuditLogRepository,
  ) {}

  private assertReviewer(actor: Actor): void {
    if (!REVIEWERS.has(actor.role)) {
      throw new ForbiddenException('Only pastors and admin staff can review venue applications');
    }
  }

  /** Public submit. A filled honeypot is a bot: accept silently, store nothing. */
  async submit(input: VenueApplicationData): Promise<{ id: string }> {
    const { website, ...data } = input;
    if (website) {
      logger.warn('Dropped venue application with filled honeypot');
      return { id: randomUUID() };
    }
    const row = await this.repo.create({
      ...data,
      sessions: data.sessions,
      targetAudience: [...data.targetAudience],
    });
    logger.info({ id: row.id, venueType: row.venueType }, 'Venue application submitted');
    return { id: row.id };
  }

  async list(actor: Actor, status?: VenueApplicationStatus): Promise<VenueApplicationInfo[]> {
    this.assertReviewer(actor);
    return (await this.repo.list(status)).map(toInfo);
  }

  async review(
    id: string,
    input: ReviewVenueApplicationInput,
    actor: Actor,
  ): Promise<VenueApplicationInfo> {
    this.assertReviewer(actor);
    if (!(await this.repo.find(id))) throw new NotFoundException('Venue application not found');
    const row = await this.repo.review(id, {
      status: input.status,
      adminNotes: input.adminNotes || null,
      reviewedById: actor.id,
    });
    await this.audit.create({
      userId: actor.id,
      action: 'venue-rental.review',
      resource: 'venue-application',
      resourceId: id,
      details: { status: input.status },
    });
    return toInfo(row);
  }

  async remove(id: string, actor: Actor): Promise<void> {
    this.assertReviewer(actor);
    const row = await this.repo.find(id);
    if (!row) throw new NotFoundException('Venue application not found');
    await this.repo.delete(id);
    await this.audit.create({
      userId: actor.id,
      action: 'venue-rental.delete',
      resource: 'venue-application',
      resourceId: id,
      details: { organization: row.organization },
    });
  }
}
