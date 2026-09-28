// packages/api/src/qr-registration/qr-registration.service.ts
//
// Event Planning (formerly QR Registration): builds a public event page with a
// QR code for the registration link and deploys it to Vercel via the church's
// token, and designs a shareable post image with Gemini. No member data — only
// the event details the user typed.
import { randomBytes } from 'node:crypto';

import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  AI_PUBLISH_ROLES,
  type EventPostImage,
  type EventPostInput,
  type PublishedQrPage,
  type QrRegistrationInput,
} from '@clawix/shared';

import { ConnectorSettingsService } from '../connectors/connector-settings.service.js';
import { VercelClient, projectNameFor } from '../connectors/vercel.client.js';
import { AuditLogRepository } from '../db/audit-log.repository.js';
import { OneShotImageService } from '../engine/one-shot/one-shot-image.service.js';
import { buildEventPostPrompt } from './event-post.js';
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
    private readonly images: OneShotImageService,
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

  /** A social-media post image (and caption) for the event, designed by Gemini. */
  async designPost(input: EventPostInput, actor: Actor): Promise<EventPostImage> {
    this.assertAllowed(actor);
    const image = await this.images.generate({
      prompt: buildEventPostPrompt(input),
      aspectRatio: input.aspectRatio,
      userId: actor.id,
      usageTag: 'ai-tool:event-planning',
    });
    await this.audit.create({
      userId: actor.id,
      action: 'event-planning.post',
      resource: 'qr-registration',
      resourceId: input.eventName,
      details: { style: input.style, aspectRatio: input.aspectRatio },
    });
    return { imageBase64: image.imageBase64, mimeType: image.mimeType, caption: image.text };
  }
}
