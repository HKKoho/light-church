import { describe, expect, it } from 'vitest';

import { systemSettingsSchema } from '../system-settings.schema.js';

describe('systemSettingsSchema.defaultTimezone', () => {
  it('accepts UTC', () => {
    const parsed = systemSettingsSchema.parse({ defaultTimezone: 'UTC' });
    expect(parsed.defaultTimezone).toBe('UTC');
  });

  it('accepts a valid IANA name', () => {
    const parsed = systemSettingsSchema.parse({ defaultTimezone: 'America/New_York' });
    expect(parsed.defaultTimezone).toBe('America/New_York');
  });

  it('rejects an invalid IANA name', () => {
    expect(() => systemSettingsSchema.parse({ defaultTimezone: 'Mars/Olympus' })).toThrow();
  });

  it('defaults to UTC when omitted', () => {
    const parsed = systemSettingsSchema.parse({});
    expect(parsed.defaultTimezone).toBe('UTC');
  });
});

describe('systemSettingsSchema.hiddenNavKeys', () => {
  it('defaults to an empty list', () => {
    expect(systemSettingsSchema.parse({}).hiddenNavKeys).toEqual([]);
  });

  it('accepts top-bar and AI tool keys, trimming whitespace', () => {
    const parsed = systemSettingsSchema.parse({
      hiddenNavKeys: [
        'topbar:bibleMinistries',
        ' topbar:careGovernance:prayer ',
        'ai-tool:主日 週報',
      ],
    });
    expect(parsed.hiddenNavKeys).toEqual([
      'topbar:bibleMinistries',
      'topbar:careGovernance:prayer',
      'ai-tool:主日 週報',
    ]);
  });

  it('rejects empty keys', () => {
    expect(() => systemSettingsSchema.parse({ hiddenNavKeys: [' '] })).toThrow();
  });
});
