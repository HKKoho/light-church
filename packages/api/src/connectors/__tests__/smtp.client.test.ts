// packages/api/src/connectors/__tests__/smtp.client.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadGatewayException } from '@nestjs/common';

const sendMailMock = vi.fn();
const closeMock = vi.fn();
const createTransport = vi.fn(() => ({ sendMail: sendMailMock, close: closeMock }));
vi.mock('nodemailer', () => ({ default: { createTransport } }));

const { fromHeader, sendMail } = await import('../smtp.client.js');

const creds = {
  host: 'mail.church.example',
  port: 587,
  secure: false,
  username: 'office@church.example',
  password: 'pw',
  fromAddress: 'office@church.example',
  fromName: 'Church "Office"',
};

describe('smtp client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the From header with and without a display name', () => {
    expect(fromHeader(creds)).toBe('"Church Office" <office@church.example>');
    expect(fromHeader({ ...creds, fromName: null })).toBe('office@church.example');
  });

  it('sends through the church server and closes the connection', async () => {
    sendMailMock.mockResolvedValueOnce({});
    await sendMail(creds, { to: 'a@b.org', subject: 'Hi', text: 'Body' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.church.example',
        port: 587,
        secure: false,
        auth: { user: 'office@church.example', pass: 'pw' },
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"Church Office" <office@church.example>',
      to: 'a@b.org',
      subject: 'Hi',
      text: 'Body',
      replyTo: 'office@church.example',
    });
    expect(closeMock).toHaveBeenCalled();
  });

  it('skips auth without a username', async () => {
    sendMailMock.mockResolvedValueOnce({});
    await sendMail({ ...creds, username: null }, { to: 'a@b.org', subject: 's', text: 't' });
    expect(createTransport).toHaveBeenCalledWith(
      expect.not.objectContaining({ auth: expect.anything() }),
    );
  });

  it('wraps server errors in a 502', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('535 auth failed'));
    await expect(
      sendMail(creds, { to: 'a@b.org', subject: 's', text: 't' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(closeMock).toHaveBeenCalled();
  });
});
