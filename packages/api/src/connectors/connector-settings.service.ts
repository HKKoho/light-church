// packages/api/src/connectors/connector-settings.service.ts
//
// Church-wide publishing connectors used by AI Tools: a Google service account
// (AI Survey → Google Forms) and a Vercel token (QR Registration → Vercel).
// Secrets are AES-256-GCM encrypted in SystemSettings.settings.connectors;
// env vars are the fallback (GOOGLE_SERVICE_ACCOUNT_JSON, VERCEL_TOKEN,
// VERCEL_TEAM_ID, VERCEL_PROJECT_NAME).
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ConnectorStatus, UpdateConnectorsInput } from '@clawix/shared';

import { decrypt, encrypt } from '../common/crypto.js';
import { SystemSettingsRepository } from '../db/system-settings.repository.js';

const SETTING_KEY = 'connectors';
export const DEFAULT_VERCEL_PROJECT = 'light-church-events';

interface StoredConnectors {
  googleServiceAccount?: string;
  vercelToken?: string;
  vercelTeamId?: string;
  vercelProjectName?: string;
}

export interface GoogleServiceAccount {
  readonly clientEmail: string;
  readonly privateKey: string;
}

export interface VercelCredentials {
  readonly token: string;
  readonly teamId: string | null;
  readonly projectName: string;
}

/** Parses a Google service-account key file; throws a 400 on anything else. */
export function parseServiceAccount(json: string): GoogleServiceAccount {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BadRequestException('The Google key file is not valid JSON');
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  const clientEmail = obj['client_email'];
  const privateKey = obj['private_key'];
  if (
    obj['type'] !== 'service_account' ||
    typeof clientEmail !== 'string' ||
    typeof privateKey !== 'string'
  ) {
    throw new BadRequestException(
      'Expected a Google service-account key (type, client_email, private_key)',
    );
  }
  return { clientEmail, privateKey };
}

const nonEmpty = (v: string | undefined): string | null => (v && v.length > 0 ? v : null);

@Injectable()
export class ConnectorSettingsService {
  constructor(private readonly settings: SystemSettingsRepository) {}

  private async stored(): Promise<StoredConnectors> {
    const row = await this.settings.get();
    const raw = (row.settings as Record<string, unknown> | null)?.[SETTING_KEY];
    return raw && typeof raw === 'object' ? (raw as StoredConnectors) : {};
  }

  async google(): Promise<GoogleServiceAccount | null> {
    const s = await this.stored();
    const json = s.googleServiceAccount
      ? decrypt(s.googleServiceAccount)
      : nonEmpty(process.env['GOOGLE_SERVICE_ACCOUNT_JSON']);
    return json ? parseServiceAccount(json) : null;
  }

  async vercel(): Promise<VercelCredentials | null> {
    const s = await this.stored();
    const token = s.vercelToken ? decrypt(s.vercelToken) : nonEmpty(process.env['VERCEL_TOKEN']);
    if (!token) return null;
    return {
      token,
      teamId: nonEmpty(s.vercelTeamId) ?? nonEmpty(process.env['VERCEL_TEAM_ID']),
      projectName:
        nonEmpty(s.vercelProjectName) ??
        nonEmpty(process.env['VERCEL_PROJECT_NAME']) ??
        DEFAULT_VERCEL_PROJECT,
    };
  }

  async status(): Promise<ConnectorStatus> {
    const [google, vercel] = await Promise.all([this.google(), this.vercel()]);
    return {
      google: { configured: google !== null, clientEmail: google?.clientEmail ?? null },
      vercel: {
        configured: vercel !== null,
        teamId: vercel?.teamId ?? null,
        projectName: vercel?.projectName ?? DEFAULT_VERCEL_PROJECT,
      },
    };
  }

  /** Empty strings remove a value; omitted fields are left unchanged. */
  async update(input: UpdateConnectorsInput): Promise<ConnectorStatus> {
    const next: StoredConnectors = { ...(await this.stored()) };
    if (input.googleServiceAccountJson !== undefined) {
      if (input.googleServiceAccountJson.trim() === '') {
        delete next.googleServiceAccount;
      } else {
        parseServiceAccount(input.googleServiceAccountJson);
        next.googleServiceAccount = encrypt(input.googleServiceAccountJson.trim());
      }
    }
    if (input.vercelToken !== undefined) {
      if (input.vercelToken === '') delete next.vercelToken;
      else next.vercelToken = encrypt(input.vercelToken);
    }
    if (input.vercelTeamId !== undefined) next.vercelTeamId = input.vercelTeamId;
    if (input.vercelProjectName !== undefined) next.vercelProjectName = input.vercelProjectName;
    await this.settings.update({ [SETTING_KEY]: next });
    return this.status();
  }
}
