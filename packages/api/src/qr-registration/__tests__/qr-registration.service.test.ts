// packages/api/src/qr-registration/__tests__/qr-registration.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConnectorSettingsService } from '../../connectors/connector-settings.service.js';
import { VercelClient } from '../../connectors/vercel.client.js';
import type { AuditLogRepository } from '../../db/audit-log.repository.js';
import type { OneShotImageService } from '../../engine/one-shot/one-shot-image.service.js';
import { buildEventPostPrompt } from '../event-post.js';
import { buildQrPage, escapeHtml } from '../qr-page.js';
import { QrRegistrationService } from '../qr-registration.service.js';

const input = {
  eventName: 'Youth Camp <2026>',
  date: '2026-10-01',
  time: '',
  location: 'Cheung Chau',
  description: 'Bring a Bible\nand a torch',
  registrationUrl: 'https://forms.gle/abc?x=1&y=2',
  language: 'en' as const,
};

const leader = { id: 'u1', role: 'pastor' };

function makeService(vercel: boolean) {
  const connectors = {
    vercel: vi.fn(async () =>
      vercel ? { token: 't', teamId: null, projectName: 'events' } : null,
    ),
  };
  const audit = { create: vi.fn(async () => ({})) };
  const images = {
    generate: vi.fn(async () => ({
      imageBase64: 'aW1n',
      mimeType: 'image/png',
      text: 'Join us!',
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    })),
  };
  return {
    service: new QrRegistrationService(
      connectors as unknown as ConnectorSettingsService,
      audit as unknown as AuditLogRepository,
      images as unknown as OneShotImageService,
    ),
    audit,
    images,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildQrPage', () => {
  it('escapes event text, embeds a QR code and skips empty rows', async () => {
    const html = await buildQrPage(input);
    expect(html).toContain('<h1>Youth Camp &lt;2026&gt;</h1>');
    expect(html).toContain('<svg');
    expect(html).toContain('href="https://forms.gle/abc?x=1&amp;y=2"');
    expect(html).toContain('Bring a Bible<br>and a torch');
    expect(html).toContain('<dt>Location</dt>');
    expect(html).not.toContain('<dt>Time</dt>');
    expect(html).not.toContain('<script');
  });

  it('uses Chinese labels in zh-TW', async () => {
    const html = await buildQrPage({ ...input, language: 'zh-TW', description: '' });
    expect(html).toContain('立即報名');
    expect(html).not.toContain('class="desc"');
  });

  it('escapes quotes', () => {
    expect(escapeHtml(`"it's"`)).toBe('&quot;it&#39;s&quot;');
  });
});

describe('QrRegistrationService', () => {
  it('previews the page for allowed roles only', async () => {
    const { service } = makeService(false);
    expect(await service.preview(input, leader)).toContain('<svg');
    await expect(service.preview(input, { id: 'v', role: 'volunteer' })).rejects.toThrow(
      /ministry leaders/,
    );
  });

  it('needs the Vercel connector to publish', async () => {
    const { service } = makeService(false);
    await expect(service.publish(input, leader)).rejects.toThrow(/not connected/);
  });

  it('deploys each event to its own project and audits it', async () => {
    const spy = vi
      .spyOn(VercelClient.prototype, 'deployPage')
      .mockResolvedValue({ url: 'https://events-youth.vercel.app', deploymentId: 'dpl' });
    const { service, audit } = makeService(true);
    expect(await service.publish(input, leader)).toEqual({
      url: 'https://events-youth.vercel.app',
      deploymentId: 'dpl',
    });
    expect(spy.mock.calls[0]?.[0]).toMatch(/^events-youth-camp-2026-[0-9a-f]{6}$/);
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'qr-registration.publish', resourceId: 'dpl' }),
    );
  });
});

const postInput = {
  ...input,
  aspectRatio: '9:16' as const,
  style: 'bold' as const,
  instructions: 'Use ocean colours',
};

describe('buildEventPostPrompt', () => {
  it('includes the event facts, style, QR space and extra instructions', () => {
    const prompt = buildEventPostPrompt(postInput);
    expect(prompt).toContain('vertical phone story');
    expect(prompt).toContain('Event: Youth Camp <2026>');
    expect(prompt).toContain('Place: Cheung Chau');
    expect(prompt).not.toContain('Time:');
    expect(prompt).toContain('bold and energetic');
    expect(prompt).toContain('QR code');
    expect(prompt).toContain('Also: Use ocean colours');
  });

  it('asks for Chinese text and skips the QR space without a link', () => {
    const prompt = buildEventPostPrompt({ ...postInput, language: 'zh-TW', registrationUrl: '' });
    expect(prompt).toContain('Traditional Chinese');
    expect(prompt).not.toContain('QR code');
  });
});

describe('QrRegistrationService.designPost', () => {
  it('asks Gemini for the post and audits it', async () => {
    const { service, audit, images } = makeService(false);
    expect(await service.designPost(postInput, leader)).toEqual({
      imageBase64: 'aW1n',
      mimeType: 'image/png',
      caption: 'Join us!',
    });
    expect(images.generate).toHaveBeenCalledWith(
      expect.objectContaining({ aspectRatio: '9:16', userId: 'u1' }),
    );
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'event-planning.post' }),
    );
  });

  it('is for ministry leaders and staff only', async () => {
    const { service, images } = makeService(false);
    await expect(service.designPost(postInput, { id: 'v', role: 'volunteer' })).rejects.toThrow(
      /ministry leaders/,
    );
    expect(images.generate).not.toHaveBeenCalled();
  });
});
