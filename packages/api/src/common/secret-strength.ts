// packages/api/src/common/secret-strength.ts
//
// Refuses to run production with a placeholder or short JWT secret: anyone
// who knows it (e.g. from .env.example) could sign their own login tokens.

const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER = /change[-_ ]?me|changeme|placeholder|example|^secret$|^password$/i;

/** Problems with the configured secrets, as human-readable messages. */
export function secretProblems(env: Readonly<Record<string, string | undefined>>): string[] {
  const problems: string[] = [];
  const jwt = env['JWT_SECRET'] ?? '';
  if (PLACEHOLDER.test(jwt)) {
    problems.push('JWT_SECRET is a placeholder value — generate one: openssl rand -hex 48');
  } else if (jwt.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }
  return problems;
}
