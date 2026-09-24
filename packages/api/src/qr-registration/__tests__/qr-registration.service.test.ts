// packages/api/src/qr-registration/__tests__/qr-registration.service.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConnectorSettingsService } from '../../connectors/connector-settings.service.js';
import { VercelClient } from '../../connectors/vercel.client.js';
import type { AuditLogRepository } from '../../db/audit-log.repository.js';
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
  return {
    service: new QrRegistrationService(
      connectors as unknown as ConnectorSettingsService,
      audit as unknown as AuditLogRepository,
    ),
    audit,
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
