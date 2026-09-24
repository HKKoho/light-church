// packages/api/src/common/__tests__/secret-strength.test.ts
import { describe, expect, it } from 'vitest';

import { secretProblems } from '../secret-strength.js';

describe('secretProblems', () => {
  it('rejects placeholder and short JWT secrets', () => {
    expect(secretProblems({ JWT_SECRET: 'change-me-in-production' })[0]).toContain('placeholder');
    expect(secretProblems({ JWT_SECRET: 'short' })[0]).toContain('at least 32');
    expect(secretProblems({})).toHaveLength(1);
  });

  it('accepts a long random secret', () => {
    expect(secretProblems({ JWT_SECRET: 'a3f9'.repeat(24) })).toEqual([]);
  });
});
