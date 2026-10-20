import { describe, expect, it } from 'vitest';

import { createLogger, maskSecrets, REDACTED, rootLogger } from '../logger.js';

describe('createLogger', () => {
  it('should create a named logger', () => {
    const logger = createLogger('test-service');

    expect(logger).toBeDefined();
  });

  it('should create a logger with context', () => {
    const logger = createLogger('test-service', {
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(logger).toBeDefined();
  });
});

describe('rootLogger', () => {
  it('should be a valid logger instance', () => {
    expect(rootLogger).toBeDefined();
    expect(typeof rootLogger.info).toBe('function');
    expect(typeof rootLogger.error).toBe('function');
    expect(typeof rootLogger.warn).toBe('function');
    expect(typeof rootLogger.debug).toBe('function');
  });
});

describe('secret redaction', () => {
  const capture = (): {
    lines: Record<string, unknown>[];
    logger: ReturnType<typeof createLogger>;
  } => {
    const lines: Record<string, unknown>[] = [];
    const logger = createLogger('redaction-test', undefined, {
      write: (chunk: string) => {
        lines.push(JSON.parse(chunk) as Record<string, unknown>);
      },
    });
    return { lines, logger };
  };

  it('redacts secret field names at the top level and one level deep', () => {
    const { lines, logger } = capture();
    logger.info(
      { apiKey: 'plain-key', config: { bot_token: 'tg-token' }, headers: { authorization: 'x' } },
      'msg',
    );

    expect(lines[0]).toMatchObject({
      apiKey: REDACTED,
      config: { bot_token: REDACTED },
      headers: { authorization: REDACTED },
    });
  });

  it('leaves non-secret fields such as key and tokens counts alone', () => {
    const { lines, logger } = capture();
    logger.info({ key: 'redis:session:1', tokens: 1234 }, 'msg');

    expect(lines[0]).toMatchObject({ key: 'redis:session:1', tokens: 1234 });
  });

  it('masks credential patterns inside free-text fields and messages', () => {
    const { lines, logger } = capture();
    const openaiKey = `sk-proj-${'a'.repeat(40)}`;
    logger.error(
      { error: `401 Incorrect API key provided: ${openaiKey}` },
      `failed calling https://api.telegram.org/file/bot123456789:${'B'.repeat(35)}/voice.ogg`,
    );

    const line = JSON.stringify(lines[0]);
    expect(line).not.toContain(openaiKey);
    expect(line).not.toContain('B'.repeat(35));
    expect(lines[0]).toMatchObject({
      error: `401 Incorrect API key provided: ${REDACTED}`,
      msg: `failed calling https://api.telegram.org/file/bot${REDACTED}/voice.ogg`,
    });
  });
});

describe('maskSecrets', () => {
  it('masks Google keys and bearer tokens but keeps surrounding text', () => {
    expect(maskSecrets(`key=AIza${'x'.repeat(35)} ok`)).toBe(`key=${REDACTED} ok`);
    expect(maskSecrets(`Authorization: Bearer ${'t'.repeat(30)}`)).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
  });

  it('returns text without secrets unchanged', () => {
    expect(maskSecrets('sk-*** short and harmless')).toBe('sk-*** short and harmless');
  });
});
