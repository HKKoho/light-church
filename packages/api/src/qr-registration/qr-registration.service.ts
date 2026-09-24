// packages/api/src/qr-registration/qr-registration.service.ts
//
// QR Registration: builds a public event page with a QR code for the
// registration link and deploys it to Vercel via the church's token. No AI
// call and no member data — only the event details the user typed.
import { randomBytes } from 'node:crypto';

import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AI_PUBLISH_ROLES, type PublishedQrPage, type QrRegistrationInput } from '@clawix/shared';

import { ConnectorSettingsService } from '../connectors/connector-settings.service.js';
import { VercelClient, projectNameFor } from '../connectors/vercel.client.js';
import { AuditLogRepository } from '../db/audit-log.repository.js';
import { buildQrPage } from './qr-page.js';

export interface Actor {
  readonly id: string;
  readonly role: string;
}

@Injectable()
export class QrRegistrationService {
  constructor(
    private readonly connectors: ConnectorSettingsService,
    private readonly audit: AuditLogRepository,
  ) {}

  private assertAllowed(actor: Actor): void {
    if (!AI_PUBLISH_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Only ministry leaders and staff can publish event pages');
    }
  }

  async preview(input: QrRegistrationInput, actor: Actor): Promise<string> {
    this.assertAllowed(actor);
    return buildQrPage(input);
  }

  async publish(input: QrRegistrationInput, actor: Actor): Promise<PublishedQrPage> {
    this.assertAllowed(actor);
    const creds = await this.connectors.vercel();
    if (!creds) {
      throw new ServiceUnavailableException(
        'Vercel is not connected — a super admin can add it under Settings → Connectors',
      );
    }
    const html = await buildQrPage(input);
    const project = projectNameFor(
      creds.projectName,
      input.eventName,
      randomBytes(3).toString('hex'),
    );
    const published = await new VercelClient(creds).deployPage(project, html);
    await this.audit.create({
      userId: actor.id,
      action: 'qr-registration.publish',
      resource: 'qr-registration',
      resourceId: published.deploymentId,
      details: { url: published.url },
    });
    return published;
  }
}
