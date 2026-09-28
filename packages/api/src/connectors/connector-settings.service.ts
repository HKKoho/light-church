// packages/api/src/connectors/connector-settings.service.ts
//
// Church-wide connectors used by AI Tools: a Google service account
// (AI Survey → Google Forms), a Vercel token (QR Registration → Vercel) and the
// church email server (Rent Church Place → replies to applicants over SMTP).
// Secrets are AES-256-GCM encrypted in SystemSettings.settings.connectors;
// env vars are the fallback (GOOGLE_SERVICE_ACCOUNT_JSON, VERCEL_TOKEN,
// VERCEL_TEAM_ID, VERCEL_PROJECT_NAME, SMTP_HOST, SMTP_PORT, SMTP_SECURE,
// SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SMTP_FROM_NAME).
import { BadRequestException, Injectable } from '@nestjs/common';
import type { ConnectorStatus, UpdateConnectorsInput } from '@clawix/shared';

import { decrypt, encrypt } from '../common/crypto.js';
import { SystemSettingsRepository } from '../db/system-settings.repository.js';

const SETTING_KEY = 'connectors';
export const DEFAULT_VERCEL_PROJECT = 'light-church-events';
export const DEFAULT_SMTP_PORT = 587;

interface StoredConnectors {
  googleServiceAccount?: string;
  vercelToken?: string;
  vercelTeamId?: string;
  vercelProjectName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromAddress?: string;
  smtpFromName?: string;
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

export interface SmtpCredentials {
  readonly host: string;
  readonly port: number;
  readonly secure: boolean;
  readonly username: string | null;
  readonly password: string | null;
  readonly fromAddress: string;
  readonly fromName: string | null;
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

  /** Connected once a host and a From address are known. */
  async smtp(): Promise<SmtpCredentials | null> {
    const s = await this.stored();
    const env = (k: string) => nonEmpty(process.env[k]);
    const host = nonEmpty(s.smtpHost) ?? env('SMTP_HOST');
    const username = nonEmpty(s.smtpUsername) ?? env('SMTP_USER');
    const fromAddress = nonEmpty(s.smtpFromAddress) ?? env('SMTP_FROM') ?? username;
    if (!host || !fromAddress) return null;
    const envPort = Number(env('SMTP_PORT'));
    const port = s.smtpPort ?? (Number.isInteger(envPort) && envPort > 0 ? envPort : null);
    const resolvedPort = port ?? DEFAULT_SMTP_PORT;
    return {
      host,
      port: resolvedPort,
      secure:
        s.smtpSecure ?? (env('SMTP_SECURE') ? env('SMTP_SECURE') === 'true' : resolvedPort === 465),
      username,
      password: s.smtpPassword ? decrypt(s.smtpPassword) : env('SMTP_PASSWORD'),
      fromAddress,
      fromName: nonEmpty(s.smtpFromName) ?? env('SMTP_FROM_NAME'),
    };
  }

  async status(): Promise<ConnectorStatus> {
    const [google, vercel, smtp] = await Promise.all([this.google(), this.vercel(), this.smtp()]);
    return {
      google: { configured: google !== null, clientEmail: google?.clientEmail ?? null },
      vercel: {
        configured: vercel !== null,
        teamId: vercel?.teamId ?? null,
        projectName: vercel?.projectName ?? DEFAULT_VERCEL_PROJECT,
      },
      smtp: {
        configured: smtp !== null,
        host: smtp?.host ?? null,
        port: smtp?.port ?? DEFAULT_SMTP_PORT,
        secure: smtp?.secure ?? false,
        username: smtp?.username ?? null,
        fromAddress: smtp?.fromAddress ?? null,
        fromName: smtp?.fromName ?? null,
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
    if (input.smtpHost !== undefined) next.smtpHost = input.smtpHost;
    if (input.smtpPort !== undefined) next.smtpPort = input.smtpPort;
    if (input.smtpSecure !== undefined) next.smtpSecure = input.smtpSecure;
    if (input.smtpUsername !== undefined) next.smtpUsername = input.smtpUsername;
    if (input.smtpPassword !== undefined) {
      if (input.smtpPassword === '') delete next.smtpPassword;
      else next.smtpPassword = encrypt(input.smtpPassword);
    }
    if (input.smtpFromAddress !== undefined) next.smtpFromAddress = input.smtpFromAddress;
    if (input.smtpFromName !== undefined) next.smtpFromName = input.smtpFromName;
    await this.settings.update({ [SETTING_KEY]: next });
    return this.status();
  }
}
