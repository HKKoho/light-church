// packages/api/src/ai-tools/tool-sso.ts
import { createHmac, randomUUID } from 'crypto';

/** Hand-off lifetime: long enough to open a tab, short enough to be useless if leaked. */
export const SSO_TOKEN_TTL_MS = 60_000;

export interface SsoUser {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
}

/**
 * Signs a single-sign-on hand-off for an external AI Tool:
 * base64url(JSON claims) + "." + base64url(HMAC-SHA256(claims, secret)).
 * The receiving app verifies the signature, audience, expiry and role, and
 * rejects a reused `jti` (see securefin-pipeline auth.ts, POST /api/auth/sso).
 */
export function signSsoToken(
  user: SsoUser,
  audience: string,
  secret: string,
  now = Date.now(),
): string {
  const claims = {
    sub: user.sub,
    email: user.email,
    role: user.role,
    aud: audience,
    iat: now,
    exp: now + SSO_TOKEN_TTL_MS,
    jti: randomUUID(),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
