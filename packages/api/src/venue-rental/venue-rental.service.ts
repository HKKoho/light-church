// packages/api/src/venue-rental/venue-rental.service.ts
//
// Rent Church Place: anyone can submit a venue-rental application from the
// public /rent page; reviewer roles list, approve/reject, email the applicant
// through the church email server (SMTP connector) and delete them.
import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createLogger, VENUE_RENTAL_REVIEWER_ROLES } from '@clawix/shared';
import type {
  ReplyVenueApplicationInput,
  ReviewVenueApplicationInput,
  VenueApplicationData,
  VenueApplicationInfo,
  VenueApplicationStatus,
  VenueMailStatus,
  VenueSession,
} from '@clawix/shared';

import { ConnectorSettingsService } from '../connectors/connector-settings.service.js';
import { fromHeader, sendMail } from '../connectors/smtp.client.js';
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
    repliedAt: row.repliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class VenueRentalService {
  constructor(
    private readonly repo: VenueApplicationRepository,
    private readonly audit: AuditLogRepository,
    private readonly connectors: ConnectorSettingsService,
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

  async mailStatus(actor: Actor): Promise<VenueMailStatus> {
    this.assertReviewer(actor);
    const smtp = await this.connectors.smtp();
    return { configured: smtp !== null, from: smtp ? fromHeader(smtp) : null };
  }

  /** Emails the applicant from the church address and records when. */
  async reply(
    id: string,
    input: ReplyVenueApplicationInput,
    actor: Actor,
  ): Promise<VenueApplicationInfo> {
    this.assertReviewer(actor);
    const row = await this.repo.find(id);
    if (!row) throw new NotFoundException('Venue application not found');
    const smtp = await this.connectors.smtp();
    if (!smtp) {
      throw new BadRequestException(
        'The church email server is not connected — a super admin can add it under Settings → Connectors',
      );
    }
    await sendMail(smtp, { to: row.email, subject: input.subject, text: input.body });
    const updated = await this.repo.markReplied(id);
    await this.audit.create({
      userId: actor.id,
      action: 'venue-rental.reply',
      resource: 'venue-application',
      resourceId: id,
      details: { to: row.email, subject: input.subject },
    });
    logger.info({ id }, 'Venue applicant emailed');
    return toInfo(updated);
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
