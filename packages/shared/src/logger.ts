import pino from 'pino';

export interface LoggerContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly agentId?: string;
  readonly requestId?: string;
  readonly sessionId?: string;
}

export const REDACTED = '[REDACTED]';

/** Field names whose values are always secrets, at the top level or one object deep. */
const SECRET_FIELDS = [
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'token',
  'botToken',
  'bot_token',
  'password',
  'secret',
  'clientSecret',
  'authorization',
  'cookie',
] as const;

const REDACT_PATHS = [
  ...SECRET_FIELDS.flatMap((field) => [field, `*.${field}`]),
  'headers.authorization',
  'headers.cookie',
  'headers["x-api-key"]',
  'headers["x-goog-api-key"]',
  '*.headers.authorization',
  '*.headers.cookie',
  '*.headers["x-api-key"]',
  '*.headers["x-goog-api-key"]',
];

/**
 * Credential shapes that can leak inside free-text fields such as
 * `error: err.message`: OpenAI/Anthropic keys, Google API keys, bearer
 * tokens, and Telegram bot tokens embedded in api.telegram.org URLs.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\b(Bearer\s+)[A-Za-z0-9._~+/-]{16,}=*/gi,
  /(\/bot)\d{6,}:[A-Za-z0-9_-]{30,}/g,
];

export function maskSecrets(text: string): string {
  return SECRET_PATTERNS.reduce(
    (masked, pattern) =>
      masked.replace(pattern, (_match, prefix?: string) =>
        typeof prefix === 'string' ? `${prefix}${REDACTED}` : REDACTED,
      ),
    text,
  );
}

function maskStringFields(obj: Record<string, unknown>): Record<string, unknown> {
  let out: Record<string, unknown> | undefined;
  for (const [field, value] of Object.entries(obj)) {
    if (typeof value !== 'string') continue;
    const masked = maskSecrets(value);
    if (masked !== value) {
      out ??= { ...obj };
      out[field] = masked;
    }
  }
  return out ?? obj;
}

export function createLogger(
  name: string,
  context?: LoggerContext,
  destination?: pino.DestinationStream,
): pino.Logger {
  const options: pino.LoggerOptions = {
    name,
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(context ? { base: { ...context } } : {}),
    redact: { paths: REDACT_PATHS, censor: REDACTED },
    formatters: {
      level(label) {
        return { level: label };
      },
      log(obj) {
        return maskStringFields(obj);
      },
    },
    hooks: {
      logMethod(args, method) {
        const masked = args.map((arg) => (typeof arg === 'string' ? maskSecrets(arg) : arg));
        method.apply(this, masked as Parameters<typeof method>);
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
  return destination ? pino(options, destination) : pino(options);
}

export const rootLogger = createLogger('clawix');
