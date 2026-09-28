// Sends plain-text email through the church's own mail server (SMTP connector).
import { BadGatewayException } from '@nestjs/common';
import { createLogger } from '@clawix/shared';
import nodemailer from 'nodemailer';

import type { SmtpCredentials } from './connector-settings.service.js';

const logger = createLogger('connectors:smtp');

export interface OutgoingMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  /** Where the recipient's reply goes; defaults to the From address. */
  readonly replyTo?: string;
}

/** "Name <address>" when a display name is set. */
export function fromHeader(creds: Pick<SmtpCredentials, 'fromAddress' | 'fromName'>): string {
  return creds.fromName
    ? `"${creds.fromName.replace(/"/g, '')}" <${creds.fromAddress}>`
    : creds.fromAddress;
}

export async function sendMail(creds: SmtpCredentials, mail: OutgoingMail): Promise<void> {
  const transport = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    ...(creds.username ? { auth: { user: creds.username, pass: creds.password ?? '' } } : {}),
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  try {
    await transport.sendMail({
      from: fromHeader(creds),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      replyTo: mail.replyTo ?? creds.fromAddress,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn({ host: creds.host, reason }, 'SMTP send failed');
    throw new BadGatewayException(`The church email server did not accept the message: ${reason}`);
  } finally {
    transport.close();
  }
}
