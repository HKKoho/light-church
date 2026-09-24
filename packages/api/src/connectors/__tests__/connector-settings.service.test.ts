// packages/api/src/connectors/__tests__/connector-settings.service.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SystemSettingsRepository } from '../../db/system-settings.repository.js';
import {
  ConnectorSettingsService,
  DEFAULT_VERCEL_PROJECT,
  parseServiceAccount,
} from '../connector-settings.service.js';

const KEY_JSON = JSON.stringify({
  type: 'service_account',
  client_email: 'forms@church.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
});

function makeService() {
  let settings: Record<string, unknown> = {};
  const repo = {
    get: vi.fn(async () => ({ settings })),
    update: vi.fn(async (patch: Record<string, unknown>) => {
      settings = { ...settings, ...patch };
      return { settings };
    }),
  };
  return {
    service: new ConnectorSettingsService(repo as unknown as SystemSettingsRepository),
    stored: () => settings['connectors'] as Record<string, string>,
  };
}

describe('parseServiceAccount', () => {
  it('reads the email and key from a service-account file', () => {
    expect(parseServiceAccount(KEY_JSON).clientEmail).toBe('forms@church.iam.gserviceaccount.com');
  });

  it('rejects invalid JSON and other key types', () => {
    expect(() => parseServiceAccount('{nope')).toThrow(/not valid JSON/);
    expect(() => parseServiceAccount(JSON.stringify({ type: 'authorized_user' }))).toThrow(
      /service-account/,
    );
  });
});

describe('ConnectorSettingsService', () => {
  beforeEach(() => {
    vi.stubEnv('PROVIDER_ENCRYPTION_KEY', 'a'.repeat(64));
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', '');
    vi.stubEnv('VERCEL_TOKEN', '');
    vi.stubEnv('VERCEL_TEAM_ID', '');
    vi.stubEnv('VERCEL_PROJECT_NAME', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports nothing configured by default', async () => {
    const { service } = makeService();
    expect(await service.status()).toEqual({
      google: { configured: false, clientEmail: null },
      vercel: { configured: false, teamId: null, projectName: DEFAULT_VERCEL_PROJECT },
    });
  });

  it('stores secrets encrypted and reads them back', async () => {
    const { service, stored } = makeService();
    const status = await service.update({
      googleServiceAccountJson: KEY_JSON,
      vercelToken: 'vc_secret',
      vercelTeamId: 'team_1',
      vercelProjectName: 'grace-events',
    });
    expect(status.google).toEqual({
      configured: true,
      clientEmail: 'forms@church.iam.gserviceaccount.com',
    });
    expect(status.vercel).toEqual({
      configured: true,
      teamId: 'team_1',
      projectName: 'grace-events',
    });
    expect(stored()['vercelToken']).not.toContain('vc_secret');
    expect(stored()['googleServiceAccount']).not.toContain('forms@church');
    expect((await service.vercel())?.token).toBe('vc_secret');
  });

  it('removes a secret when given an empty string', async () => {
    const { service } = makeService();
    await service.update({ googleServiceAccountJson: KEY_JSON, vercelToken: 'vc' });
    const status = await service.update({ googleServiceAccountJson: ' ', vercelToken: '' });
    expect(status.google.configured).toBe(false);
    expect(status.vercel.configured).toBe(false);
  });

  it('falls back to env vars', async () => {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_JSON', KEY_JSON);
    vi.stubEnv('VERCEL_TOKEN', 'env_token');
    vi.stubEnv('VERCEL_TEAM_ID', 'team_env');
    vi.stubEnv('VERCEL_PROJECT_NAME', 'env-events');
    const { service } = makeService();
    expect((await service.google())?.clientEmail).toBe('forms@church.iam.gserviceaccount.com');
    expect(await service.vercel()).toEqual({
      token: 'env_token',
      teamId: 'team_env',
      projectName: 'env-events',
    });
  });
});
